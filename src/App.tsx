import React, { useState, useCallback } from 'react';
import {
    db, seedData, fmtMoney, checkout, cargarStock, agregarProducto,
    getReporteDiario, getReporteSemanal, getProducto, getEspecies, getCategorias,
    agregarFactura, actualizarEstadoFactura, getFacturas, editarFactura, pagarFactura, cancelarPago,
    MetodoPago, EstadoFactura, type Producto, type ItemCarrito, type Factura, type TipoFactura,
} from './pos';

// ── Tipos locales ─────────────────────────────────────
type Tab = 'pos' | 'inventory' | 'report' | 'weekly' | 'facturas';
type ToastType = 'success' | 'error';
interface Toast { id: number; msg: string; type: ToastType; }

// ── Inicializar datos ─────────────────────────────────
seedData();

// ═══════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════
export default function App() {
    const [tab, setTab] = useState<Tab>('pos');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const addToast = useCallback((msg: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, []);

    const flashSuccess = useCallback(() => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 650);
    }, []);

    const forceRefresh = useCallback(() => setRefresh((r) => r + 1), []);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <>
            <div className="topbar">
                <div className="logo">
                    <span className="logo-icon">🐾</span>
                    <div>
                        FJ <span style={{ color: 'var(--accent)', opacity: 1 }}>Mascotas</span>
                        <span>Tienda de alimentos y accesorios</span>
                    </div>
                </div>
                <div className="nav-tabs">
                    {([['pos', '🛒', 'Terminal de Venta'], ['inventory', '📦', 'Inventario'], ['report', '📊', 'Reporte del Día'], ['weekly', '📅', 'Reporte Semanal'], ['facturas', '🧾', 'Facturas']] as const).map(([id, icon, label]) => (
                        <button key={id} className={`nav-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
                            <span className="tab-icon">{icon}</span>{label}
                        </button>
                    ))}
                </div>
                <div className="topbar-right">
                    <div className="date-badge">{dateStr}</div>
                </div>
            </div>

            {/* SCREENS */}
            <div className="screen-container">
                {tab === 'pos' && (
                    <POSScreen
                        key={refresh}
                        addToast={addToast}
                        flashSuccess={flashSuccess}
                        onSaleComplete={forceRefresh}
                    />
                )}
                {tab === 'inventory' && (
                    <InventoryScreen key={refresh} addToast={addToast} onRefresh={forceRefresh} />
                )}
                {tab === 'report' && <ReportScreen key={refresh} />}
                {tab === 'weekly' && <WeeklyReportScreen key={refresh} />}
                {tab === 'facturas' && <FacturasScreen key={refresh} addToast={addToast} />}
            </div>

            {/* TOASTS */}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
                ))}
            </div>

            {/* SUCCESS FLASH */}
            {showSuccess && (
                <div className="success-overlay">
                    <div className="success-icon">✅</div>
                </div>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════
// POS SCREEN
// ═══════════════════════════════════════════════════════
function POSScreen({ addToast, flashSuccess, onSaleComplete }: {
    addToast: (m: string, t: ToastType) => void;
    flashSuccess: () => void;
    onSaleComplete: () => void;
}) {
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [query, setQuery] = useState('');
    const [especieFilter, setEspecieFilter] = useState('Todos');
    const [catFilter, setCatFilter] = useState('Todos');
    const [sortBy, setSortBy] = useState<'nombre' | 'precio_asc' | 'precio_desc' | 'peso_asc' | 'peso_desc'>('nombre');
    const [metodo, setMetodo] = useState<MetodoPago>(MetodoPago.Efectivo);

    const especies = getEspecies();
    const categorias = getCategorias();

    const ESPECIE_ICONS: Record<string, string> = { Todos: '🐾', Perro: '🐕', Gato: '🐈', Ave: '🐦', Pez: '🐟', Conejo: '🐇', Otros: '🐾' };

    const SORT_OPTIONS: { value: typeof sortBy; label: string }[] = [
        { value: 'nombre', label: '🔤 A → Z' },
        { value: 'precio_asc', label: '💲 Más barato' },
        { value: 'precio_desc', label: '💲 Más caro' },
        { value: 'peso_asc', label: '⚖️ Menor peso' },
        { value: 'peso_desc', label: '⚖️ Mayor peso' },
    ];

    const productosFiltradosYOrdenados = [...db.productos]
        .filter((p) => {
            const matchQ = !query || p.nombre.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
            const matchEsp = especieFilter === 'Todos' || p.especie === especieFilter;
            const matchCat = catFilter === 'Todos' || p.categoria === catFilter;
            return matchQ && matchEsp && matchCat;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'nombre': return a.nombre.localeCompare(b.nombre, 'es');
                case 'precio_asc': return a.precio_venta - b.precio_venta;
                case 'precio_desc': return b.precio_venta - a.precio_venta;
                case 'peso_asc': return (a.peso_kg ?? 9999) - (b.peso_kg ?? 9999);
                case 'peso_desc': return (b.peso_kg ?? 0) - (a.peso_kg ?? 0);
            }
        });

    const addToCart = (prod: Producto) => {
        if (prod.stock_actual === 0) return;
        setCarrito((prev) => {
            const existing = prev.find((i) => i.id === prod.id);
            if (existing) {
                if (existing.qty >= prod.stock_actual) { addToast('⚠️ No hay más stock disponible', 'error'); return prev; }
                return prev.map((i) => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio_venta, qty: 1, emoji: prod.emoji }];
        });
    };

    const changeQty = (id: number, delta: number) => {
        setCarrito((prev) => {
            const prod = getProducto(id);
            return prev
                .map((i) => {
                    if (i.id !== id) return i;
                    const newQty = i.qty + delta;
                    if (newQty > (prod?.stock_actual ?? 0)) { addToast('⚠️ Stock máximo alcanzado', 'error'); return i; }
                    return { ...i, qty: Math.max(0, newQty) };
                })
                .filter((i) => i.qty > 0);
        });
    };

    const handleCheckout = () => {
        const result = checkout(carrito, metodo);
        if (!result.ok) { addToast(`❌ ${result.error}`, 'error'); return; }
        setCarrito([]);
        flashSuccess();
        addToast(`✅ Venta #${result.ventaId} registrada — ${fmtMoney(result.total!)}`, 'success');
        onSaleComplete();
    };

    const total = carrito.reduce((s, i) => s + i.qty * i.precio, 0);
    const count = carrito.reduce((s, i) => s + i.qty, 0);

    return (
        <div className="pos-layout">
            {/* LEFT — Productos */}
            <div className="pos-left">

                {/* Barra de búsqueda + Ordenamiento en una línea */}
                <div className="search-sort-row">
                    <div className="search-bar search-compact">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Nombre o SKU..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="search-clear" onClick={() => setQuery('')}>✕</button>
                        )}
                    </div>
                    <select
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro por especie */}
                <div className="filter-row">
                    <span className="filter-label">Mascota:</span>
                    <div className="category-pills">
                        {especies.map((esp) => (
                            <button
                                key={esp}
                                className={`pill${especieFilter === esp ? ' active' : ''}`}
                                onClick={() => setEspecieFilter(esp)}
                            >
                                {ESPECIE_ICONS[esp] ?? '🐾'} {esp}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filtro por categoría */}
                <div className="filter-row">
                    <span className="filter-label">Categoría:</span>
                    <div className="category-pills">
                        {categorias.map((cat) => (
                            <button
                                key={cat}
                                className={`pill${catFilter === cat ? ' active' : ''}`}
                                onClick={() => setCatFilter(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="products-grid">
                    {productosFiltradosYOrdenados.length === 0 ? (
                        <div className="no-results">Sin resultados</div>
                    ) : (
                        productosFiltradosYOrdenados.map((p) => {
                            let stockClass = 'stock-ok';
                            let stockLabel = String(p.stock_actual);
                            if (p.stock_actual === 0) { stockClass = 'stock-zero'; stockLabel = 'Sin stock'; }
                            else if (p.stock_actual <= p.stock_minimo) { stockClass = 'stock-low'; stockLabel = `⚠️ ${p.stock_actual}`; }
                            return (
                                <div
                                    key={p.id}
                                    className={`product-card${p.stock_actual === 0 ? ' out-of-stock' : ''}`}
                                    onClick={() => addToCart(p)}
                                >
                                    <span className={`product-stock-badge ${stockClass}`}>{stockLabel}</span>
                                    <div className="product-emoji">{p.emoji}</div>
                                    <div className="product-name">{p.nombre}</div>
                                    <div className="product-sku">{p.sku}{p.peso_kg ? ` · ${p.peso_kg < 1 ? `${p.peso_kg * 1000}g` : `${p.peso_kg}kg`}` : ''}</div>
                                    <div className="product-price">{fmtMoney(p.precio_venta)}</div>
                                    <div className="product-especie-badge">{ESPECIE_ICONS[p.especie] ?? '🐾'} {p.especie}</div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>

            {/* RIGHT — Carrito */}
            <div className="pos-right">
                <div className="cart-header">
                    <span>Carrito</span>
                    <span className="cart-count">{count}</span>
                </div>

                <div className="cart-items">
                    {carrito.length === 0 ? (
                        <div className="cart-empty">
                            <div className="cart-empty-icon">🛒</div>
                            <div>Agregá productos al carrito</div>
                        </div>
                    ) : (
                        carrito.map((item) => (
                            <div key={item.id} className="cart-item">
                                <span className="cart-item-emoji">{item.emoji}</span>
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.nombre}</div>
                                    <div className="cart-item-sub">{fmtMoney(item.precio)} c/u</div>
                                </div>
                                <div className="qty-controls">
                                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                                    <span className="qty-num">{item.qty}</span>
                                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                                </div>
                                <span className="cart-item-price">{fmtMoney(item.qty * item.precio)}</span>
                                <button className="remove-btn" onClick={() => setCarrito((p) => p.filter((i) => i.id !== item.id))}>✕</button>
                            </div>
                        ))
                    )}
                </div>

                <hr className="cart-divider" />

                <div className="cart-total-row">
                    <span className="total-label">Total</span>
                    <span className="total-amount">{fmtMoney(total)}</span>
                </div>

                <div>
                    <div className="payment-label">Método de Pago</div>
                    <div className="payment-methods">
                        {([MetodoPago.Efectivo, MetodoPago.Transferencia, MetodoPago.Tarjeta] as const).map((m) => {
                            const icons: Record<MetodoPago, string> = { Efectivo: '💵', Transferencia: '🏦', Tarjeta: '💳' };
                            return (
                                <button
                                    key={m}
                                    className={`pay-btn${metodo === m ? ' selected' : ''}`}
                                    onClick={() => setMetodo(m)}
                                >
                                    <span className="pay-icon">{icons[m]}</span>{m}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    className="checkout-btn"
                    disabled={carrito.length === 0}
                    onClick={handleCheckout}
                >
                    🐾 FINALIZAR VENTA
                </button>
            </div>
        </div>
    );
}

function InventoryScreen({ addToast, onRefresh }: {
    addToast: (m: string, t: ToastType) => void;
    onRefresh: () => void;
}) {
    const [stockModal, setStockModal] = useState<Producto | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [stockQty, setStockQty] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [tick, setTick] = useState(0);

    // ── Filtros ──
    const [query, setQuery] = useState('');
    const [especieFilter, setEspecieFilter] = useState('Todos');
    const [catFilter, setCatFilter] = useState('Todos');
    const [stockFilter, setStockFilter] = useState<'todos' | 'ok' | 'bajo' | 'sin'>('todos');
    const [sortBy, setSortBy] = useState<'nombre' | 'precio_asc' | 'precio_desc' | 'stock_asc' | 'stock_desc'>('nombre');

    const ESPECIE_ICONS: Record<string, string> = { Todos: '🐾', Perro: '🐕', Gato: '🐈', Ave: '🐦', Pez: '🐟', Conejo: '🐇', Otros: '🐾' };
    const SORT_INV: { value: typeof sortBy; label: string }[] = [
        { value: 'nombre', label: '🔤 A → Z' },
        { value: 'precio_asc', label: '💲 Precio ↑' },
        { value: 'precio_desc', label: '💲 Precio ↓' },
        { value: 'stock_asc', label: '📦 Stock ↑' },
        { value: 'stock_desc', label: '📦 Stock ↓' },
    ];
    const especies = getEspecies();
    const categorias = getCategorias();

    // Stats (sobre todos, sin filtrar)
    const total = db.productos.length;
    const sinStock = db.productos.filter((p) => p.stock_actual === 0).length;
    const stockBajo = db.productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length;
    const ok = total - sinStock - stockBajo;

    // Lista filtrada y ordenada
    const lista = [...db.productos]
        .filter((p) => {
            const matchQ = !query || p.nombre.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
            const matchEsp = especieFilter === 'Todos' || p.especie === especieFilter;
            const matchCat = catFilter === 'Todos' || p.categoria === catFilter;
            const matchStock =
                stockFilter === 'todos' ? true :
                    stockFilter === 'sin' ? p.stock_actual === 0 :
                        stockFilter === 'bajo' ? (p.stock_actual > 0 && p.stock_actual <= p.stock_minimo) :
                            (p.stock_actual > p.stock_minimo);
            return matchQ && matchEsp && matchCat && matchStock;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'nombre': return a.nombre.localeCompare(b.nombre, 'es');
                case 'precio_asc': return a.precio_venta - b.precio_venta;
                case 'precio_desc': return b.precio_venta - a.precio_venta;
                case 'stock_asc': return a.stock_actual - b.stock_actual;
                case 'stock_desc': return b.stock_actual - a.stock_actual;
            }
        });

    const handleStockSave = () => {
        const qty = parseInt(stockQty);
        if (!stockModal || !qty || qty <= 0) { addToast('⚠️ Ingresá una cantidad válida', 'error'); return; }
        cargarStock(stockModal.id, qty, stockNote || 'Carga manual');
        addToast(`✅ +${qty} unidades agregadas a ${stockModal.nombre}`, 'success');
        setStockModal(null); setStockQty(''); setStockNote('');
        setTick((t) => t + 1); onRefresh();
    };

    return (
        <div className="inv-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">📦 Inventario</div>
                <button className="btn-secondary" onClick={() => setAddModal(true)}>➕ Nuevo Producto</button>
            </div>

            {/* Stats — clickeables como filtro rápido de stock */}
            <div className="inv-stats">
                {([
                    { label: 'Total Productos', value: total, cls: '', key: 'todos' },
                    { label: 'Stock OK', value: ok, cls: 'ok', key: 'ok' },
                    { label: 'Stock Bajo', value: stockBajo, cls: 'warn', key: 'bajo' },
                    { label: 'Sin Stock', value: sinStock, cls: 'danger', key: 'sin' },
                ] as const).map((s) => (
                    <div
                        key={s.label}
                        className={`inv-stat inv-stat-btn${stockFilter === s.key ? ' inv-stat-active' : ''}`}
                        onClick={() => setStockFilter(stockFilter === s.key ? 'todos' : s.key)}
                    >
                        <div className="inv-stat-label">{s.label}</div>
                        <div className={`inv-stat-value ${s.cls}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="inv-filters">
                {/* Buscador + sort */}
                <div className="search-sort-row">
                    <div className="search-bar search-compact">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Nombre o SKU..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
                    </div>
                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                        {SORT_INV.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Especie */}
                <div className="filter-row">
                    <span className="filter-label">Mascota:</span>
                    <div className="category-pills">
                        {especies.map((esp) => (
                            <button key={esp} className={`pill${especieFilter === esp ? ' active' : ''}`} onClick={() => setEspecieFilter(esp)}>
                                {ESPECIE_ICONS[esp] ?? '🐾'} {esp}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categoría */}
                <div className="filter-row">
                    <span className="filter-label">Categoría:</span>
                    <div className="category-pills">
                        {categorias.map((cat) => (
                            <button key={cat} className={`pill${catFilter === cat ? ' active' : ''}`} onClick={() => setCatFilter(cat)}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Mascota</th>
                            <th>Categoría</th>
                            <th>Precio Venta</th>
                            <th>Precio Costo</th>
                            <th>Stock Actual</th>
                            <th>Stock Mín.</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>Sin resultados para los filtros aplicados</td></tr>
                        ) : lista.map((p) => {
                            let sc = 'ok';
                            if (p.stock_actual === 0) sc = 'zero';
                            else if (p.stock_actual <= p.stock_minimo) sc = 'low';
                            return (
                                <tr key={p.id}>
                                    <td><span style={{ marginRight: 8 }}>{p.emoji}</span><strong>{p.nombre}</strong></td>
                                    <td><span className="td-sku">{p.sku}{p.peso_kg ? ` · ${p.peso_kg < 1 ? `${p.peso_kg * 1000}g` : `${p.peso_kg}kg`}` : ''}</span></td>
                                    <td style={{ fontSize: '0.85rem' }}>{ESPECIE_ICONS[p.especie] ?? '🐾'} {p.especie}</td>
                                    <td>{p.categoria}</td>
                                    <td>{fmtMoney(p.precio_venta)}</td>
                                    <td style={{ color: 'var(--muted)' }}>{fmtMoney(p.precio_costo)}</td>
                                    <td><span className={`stock-cell ${sc}`}>{p.stock_actual}</span></td>
                                    <td style={{ color: 'var(--muted)' }}>{p.stock_minimo}</td>
                                    <td>
                                        <button className="add-stock-btn" onClick={() => { setStockModal(p); setStockQty(''); setStockNote(''); }}>
                                            📥 Cargar Stock
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal: Cargar Stock */}
            {stockModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStockModal(null)}>
                    <div className="modal">
                        <div className="modal-title">📥 Cargar Stock</div>
                        <div className="modal-body">
                            <div className="form-group">
                                <div className="form-label">Producto</div>
                                <input className="form-input" readOnly value={`${stockModal.emoji} ${stockModal.nombre}`} />
                            </div>
                            <div className="form-group">
                                <div className="form-label">Stock actual</div>
                                <input className="form-input" readOnly value={stockModal.stock_actual} />
                            </div>
                            <div className="form-group">
                                <div className="form-label">Cantidad a agregar</div>
                                <input className="form-input" type="number" min="1" placeholder="Ej: 10" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <div className="form-label">Nota (opcional)</div>
                                <input className="form-input" placeholder="Ej: Compra a proveedor X" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setStockModal(null)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleStockSave}>✅ Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Nuevo Producto */}
            {addModal && <AddProductModal onClose={() => setAddModal(false)} addToast={addToast} onSave={() => { setTick((t) => t + 1); onRefresh(); }} />}
        </div>
    );
}

// ── Modal Agregar Producto ────────────────────────────
function AddProductModal({ onClose, addToast, onSave }: {
    onClose: () => void;
    addToast: (m: string, t: ToastType) => void;
    onSave: () => void;
}) {
    const [form, setForm] = useState({ nombre: '', sku: '', pventa: '', pcosto: '', stock: '', stockmin: '5', cat: '', especie: 'Perro', emoji: '', imagen: '' });
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const save = () => {
        if (!form.nombre.trim() || !form.pventa) { addToast('⚠️ Nombre y precio son obligatorios', 'error'); return; }
        const newId = db.productos.length ? Math.max(...db.productos.map((p) => p.id)) + 1 : 1;
        agregarProducto({
            nombre: form.nombre.trim(),
            sku: form.sku.trim() || `SKU-${newId}`,
            precio_venta: parseFloat(form.pventa),
            precio_costo: parseFloat(form.pcosto) || 0,
            stock_actual: parseInt(form.stock) || 0,
            stock_minimo: parseInt(form.stockmin) || 5,
            categoria: form.cat.trim() || 'General',
            especie: form.especie || 'Perro',
            emoji: form.emoji.trim() || '🛍️',
            imagen: form.imagen.trim() || undefined,
        });
        addToast(`✅ Producto "${form.nombre}" agregado`, 'success');
        onSave();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 560 }}>
                <div className="modal-title">➕ Nuevo Producto</div>
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Nombre *</div>
                            <input className="form-input" placeholder="Ej: Royal Canin Adulto 3kg" value={form.nombre} onChange={set('nombre')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">SKU / Código</div>
                            <input className="form-input" placeholder="Ej: RC-AD-3" value={form.sku} onChange={set('sku')} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Especie / Mascota</div>
                            <select className="form-input" value={form.especie} onChange={set('especie')}>
                                <option value="Perro">🐕 Perro</option>
                                <option value="Gato">🐈 Gato</option>
                                <option value="Ave">🐦 Ave</option>
                                <option value="Pez">🐟 Pez</option>
                                <option value="Conejo">🐇 Conejo</option>
                                <option value="Otros">🐾 Otros</option>
                                <option value="Todos">🐾 Todos</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <div className="form-label">Categoría</div>
                            <input className="form-input" placeholder="Ej: Alimento, Snacks, Higiene" value={form.cat} onChange={set('cat')} />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="form-label">URL de Foto (opcional)</div>
                        <input className="form-input" placeholder="https://..." value={form.imagen} onChange={set('imagen')} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Precio Venta *</div>
                            <input className="form-input" type="number" placeholder="0" step="0.01" value={form.pventa} onChange={set('pventa')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">Precio Costo</div>
                            <input className="form-input" type="number" placeholder="0" step="0.01" value={form.pcosto} onChange={set('pcosto')} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Stock Inicial</div>
                            <input className="form-input" type="number" placeholder="0" min="0" value={form.stock} onChange={set('stock')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">Stock Mínimo</div>
                            <input className="form-input" type="number" placeholder="5" min="0" value={form.stockmin} onChange={set('stockmin')} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Categoría</div>
                            <input className="form-input" placeholder="Ej: Bebidas" value={form.cat} onChange={set('cat')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">Emoji (ícono)</div>
                            <input className="form-input" placeholder="🛍️" maxLength={2} value={form.emoji} onChange={set('emoji')} />
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={save}>✅ Agregar Producto</button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// REPORT SCREEN — con selector de fecha
// ═══════════════════════════════════════════════════════
function toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function ReportScreen() {
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));
    const [tick, setTick] = useState(0);

    const fechaObj = new Date(selectedDate + 'T12:00:00'); // evitar timezone shift
    const report = getReporteDiario(fechaObj);

    const isToday = selectedDate === toDateInputValue(today);
    const labelFecha = fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const metodosConfig: { key: MetodoPago; icon: string }[] = [
        { key: MetodoPago.Efectivo, icon: '💵' },
        { key: MetodoPago.Transferencia, icon: '🏦' },
        { key: MetodoPago.Tarjeta, icon: '💳' },
    ];

    return (
        <div className="report-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">📊 Reporte del Día</div>
                <div className="date-filter-group">
                    <button className="date-nav-btn" onClick={() => {
                        const d = new Date(selectedDate + 'T12:00:00');
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(toDateInputValue(d));
                    }}>◀</button>
                    <input
                        type="date"
                        className="date-picker-input"
                        value={selectedDate}
                        max={toDateInputValue(today)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button className="date-nav-btn" disabled={isToday} onClick={() => {
                        const d = new Date(selectedDate + 'T12:00:00');
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(toDateInputValue(d));
                    }}>▶</button>
                    {!isToday && (
                        <button className="btn-accent-sm" onClick={() => setSelectedDate(toDateInputValue(today))}>Hoy</button>
                    )}
                </div>
                <button className="btn-secondary" onClick={() => setTick((t) => t + 1)}>🔄</button>
            </div>

            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 12, textTransform: 'capitalize' }}>{labelFecha}</div>

            <div className="report-scroll">
                {/* Total del día */}
                <div className="report-card big">
                    <div className="report-card-label">💰 Total vendido</div>
                    <div className="report-card-value" style={{ color: 'var(--accent)' }}>{fmtMoney(report.totalVentas)}</div>
                    <div className="report-card-sub">{report.cantidadVentas} venta{report.cantidadVentas !== 1 ? 's' : ''} realizadas</div>
                </div>
                <div className="report-card big" style={{ borderColor: 'var(--success)', backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
                    <div className="report-card-label">📈 Utilidad Real</div>
                    <div className="report-card-value" style={{ color: 'var(--success)' }}>{fmtMoney(report.totalUtilidad)}</div>
                    <div className="report-card-sub">Costo de ventas: {fmtMoney(report.totalCosto)}</div>
                </div>

                {/* Por método */}
                <div className="report-grid-3">
                    {metodosConfig.map(({ key, icon }) => {
                        const d = report.porMetodo[key];
                        return (
                            <div key={key} className="report-card">
                                <div className="report-card-label">{icon} {key}</div>
                                <div className="report-card-value" style={{ fontSize: '1.5rem', color: 'var(--accent2)' }}>{fmtMoney(d.total)}</div>
                                <div className="report-card-sub">{d.cantidad} venta{d.cantidad !== 1 ? 's' : ''}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Log de ventas */}
                <div className="sales-log">
                    <h3>🧾 Detalle de ventas</h3>
                    {report.ventas.length === 0 ? (
                        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No hay ventas para esta fecha 🛒</div>
                    ) : (
                        [...report.ventas].reverse().map((v) => {
                            const t = new Date(v.fecha_hora);
                            const timeStr = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                            const itemNames = v.items.map((d) => `${d.cantidad}x ${d.producto?.nombre ?? '?'}`).join(', ');
                            return (
                                <div key={v.id_venta} className="log-item">
                                    <div className="log-dot" />
                                    <div className="log-info">
                                        <div className="log-time">{timeStr} — Venta #{v.id_venta}</div>
                                        <div className="log-items-list">{itemNames}</div>
                                    </div>
                                    <span className="log-method">{v.metodo_pago}</span>
                                    <span className="log-total">{fmtMoney(v.total_venta)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// WEEKLY REPORT SCREEN
// ═══════════════════════════════════════════════════════
function WeeklyReportScreen() {
    const today = new Date();
    const [weekOffset, setWeekOffset] = useState(0); // 0 = semana actual, -1 = semana pasada...

    const baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    const report = getReporteSemanal(baseDate);

    const semanaLabel = weekOffset === 0
        ? 'Esta semana'
        : weekOffset === -1
            ? 'Semana pasada'
            : `Hace ${Math.abs(weekOffset)} semanas`;

    return (
        <div className="report-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">📅 Reporte Semanal</div>
                <div className="week-nav">
                    <button className="date-nav-btn" onClick={() => setWeekOffset((w) => w - 1)}>◀</button>
                    <span className="week-label">{semanaLabel}</span>
                    <button className="date-nav-btn" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => w + 1)}>▶</button>
                </div>
            </div>

            {/* Totales de la semana */}
            <div className="report-grid-3" style={{ marginBottom: 20 }}>
                <div className="report-card big">
                    <div className="report-card-label">💰 Total de la semana</div>
                    <div className="report-card-value" style={{ color: 'var(--accent)' }}>{fmtMoney(report.totalSemana)}</div>
                </div>
                <div className="report-card big" style={{ borderColor: 'var(--success)', backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
                    <div className="report-card-label">📈 Utilidad Real</div>
                    <div className="report-card-value" style={{ color: 'var(--success)' }}>{fmtMoney(report.totalUtilidadSemana)}</div>
                </div>
                <div className="report-card big">
                    <div className="report-card-label">🛒 Ventas totales</div>
                    <div className="report-card-value" style={{ color: 'var(--accent2)' }}>{report.cantidadSemana}</div>
                </div>
            </div>

            {/* Gráfico de barras */}
            <div className="weekly-chart">
                <div className="chart-title">📊 Ventas por día</div>
                <div className="bar-chart">
                    {report.dias.map((dia) => {
                        const pct = report.maxDiario > 0 ? (dia.totalVentas / report.maxDiario) * 100 : 0;
                        const isHoy = dia.fecha.toDateString() === today.toDateString();
                        return (
                            <div key={dia.label} className="bar-item">
                                <div className="bar-value">{dia.totalVentas > 0 ? fmtMoney(dia.totalVentas) : ''}</div>
                                <div className="bar-track">
                                    <div
                                        className={`bar-fill${isHoy ? ' bar-today' : ''}`}
                                        style={{ height: `${Math.max(pct, 2)}%` }}
                                    />
                                </div>
                                <div className={`bar-label${isHoy ? ' bar-label-today' : ''}`}>{dia.label}</div>
                                <div className="bar-count">{dia.cantidadVentas > 0 ? `${dia.cantidadVentas}v` : '—'}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tabla diaria */}
            <div className="table-wrap" style={{ marginTop: 20 }}>
                <table>
                    <thead>
                        <tr>
                            <th>Día</th>
                            <th>Total</th>
                            <th>Ventas</th>
                            <th>💵 Efectivo</th>
                            <th>🏦 Transfer.</th>
                            <th>💳 Tarjeta</th>
                            <th>Top productos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.dias.map((dia) => {
                            const isHoy = dia.fecha.toDateString() === today.toDateString();
                            return (
                                <tr key={dia.label} className={isHoy ? 'row-today' : ''}>
                                    <td><strong>{dia.label}</strong>{isHoy && <span className="badge-hoy"> HOY</span>}</td>
                                    <td style={{ color: dia.totalVentas > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                                        {dia.totalVentas > 0 ? fmtMoney(dia.totalVentas) : '—'}
                                    </td>
                                    <td>{dia.cantidadVentas || '—'}</td>
                                    <td style={{ color: 'var(--muted)' }}>{dia.porMetodo.Efectivo.total > 0 ? fmtMoney(dia.porMetodo.Efectivo.total) : '—'}</td>
                                    <td style={{ color: 'var(--muted)' }}>{dia.porMetodo.Transferencia.total > 0 ? fmtMoney(dia.porMetodo.Transferencia.total) : '—'}</td>
                                    <td style={{ color: 'var(--muted)' }}>{dia.porMetodo.Tarjeta.total > 0 ? fmtMoney(dia.porMetodo.Tarjeta.total) : '—'}</td>
                                    <td className="top-prods">
                                        {dia.topProductos.length > 0
                                            ? dia.topProductos.map((p) => `${p.emoji} ${p.nombre} ×${p.cantidad}`).join(' · ')
                                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// FACTURAS SCREEN
// ═══════════════════════════════════════════════════════
function FacturasScreen({ addToast }: { addToast: (m: string, t: ToastType) => void }) {
    const [tick, setTick] = useState(0);
    const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | 'Todos'>('Todos');
    const [filtroTipo, setFiltroTipo] = useState<TipoFactura | 'Todos'>('Todos');
    const [query, setQuery] = useState('');
    const [modal, setModal] = useState(false);
    const [detalle, setDetalle] = useState<Factura | null>(null);

    const refresh = () => setTick((t) => t + 1);
    const facturas = getFacturas();

    // Stats
    const totalFacturas = facturas.length;
    const porPagar = facturas.filter((f) => f.estado === EstadoFactura.PorPagar);
    const pagadas = facturas.filter((f) => f.estado === EstadoFactura.Pagada);
    const vencidas = facturas.filter((f) => f.estado === EstadoFactura.Vencida);
    const montoPendiente = [...porPagar, ...vencidas].reduce((s, f) => s + f.monto_total, 0);

    // Lista filtrada
    const lista = facturas.filter((f) => {
        const matchEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
        const matchTipo = filtroTipo === 'Todos' || f.tipo === filtroTipo;
        const matchQ = !query || f.numero.toLowerCase().includes(query.toLowerCase()) || f.proveedor_cliente.toLowerCase().includes(query.toLowerCase()) || f.descripcion.toLowerCase().includes(query.toLowerCase());
        return matchEstado && matchTipo && matchQ;
    }).sort((a, b) => b.id - a.id);

    const ESTADO_CONFIG: Record<EstadoFactura, { color: string; icon: string }> = {
        [EstadoFactura.PorPagar]: { color: 'estado-porpagar', icon: '🟡' },
        [EstadoFactura.Pagada]:   { color: 'estado-pagada',   icon: '🟢' },
        [EstadoFactura.Vencida]:  { color: 'estado-vencida',  icon: '🔴' },
        [EstadoFactura.Anulada]:  { color: 'estado-anulada',  icon: '⚫' },
    };

    const handleMarcarPagada = (f: Factura) => {
        actualizarEstadoFactura(f.id, EstadoFactura.Pagada);
        addToast(`✅ Factura ${f.numero} marcada como Pagada`, 'success');
        refresh();
    };

    const handleAnular = (f: Factura) => {
        actualizarEstadoFactura(f.id, EstadoFactura.Anulada);
        addToast(`🚫 Factura ${f.numero} anulada`, 'success');
        refresh();
    };

    const fmtDate = (iso: string) => {
        if (!iso) return '—';
        // Handle both "YYYY-MM-DD" and full ISO strings
        const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="fact-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">🧾 Facturas</div>
                <button className="btn-primary" onClick={() => setModal(true)}>➕ Nueva Factura</button>
            </div>

            {/* Stats */}
            <div className="fact-stats">
                {[
                    { label: 'Total', value: totalFacturas, sub: 'registradas', cls: '' },
                    { label: 'Por Pagar', value: porPagar.length, sub: fmtMoney(porPagar.reduce((s, f) => s + f.monto_total, 0)), cls: 'warn' },
                    { label: 'Pagadas', value: pagadas.length, sub: fmtMoney(pagadas.reduce((s, f) => s + f.monto_total, 0)), cls: 'ok' },
                    { label: 'Vencidas', value: vencidas.length, sub: fmtMoney(vencidas.reduce((s, f) => s + f.monto_total, 0)), cls: 'danger' },
                    { label: 'Pendiente Total', value: fmtMoney(montoPendiente), sub: 'por cobrar/pagar', cls: 'accent' },
                ].map((s) => (
                    <div key={s.label} className="fact-stat">
                        <div className="fact-stat-label">{s.label}</div>
                        <div className={`fact-stat-value ${s.cls}`}>{s.value}</div>
                        <div className="fact-stat-sub">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="fact-filters">
                <div className="search-bar search-compact">
                    <span>🔍</span>
                    <input type="text" placeholder="Número, proveedor/cliente..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
                </div>
                <div className="category-pills">
                    {(['Todos', EstadoFactura.PorPagar, EstadoFactura.Pagada, EstadoFactura.Vencida, EstadoFactura.Anulada] as const).map((e) => (
                        <button key={e} className={`pill${filtroEstado === e ? ' active' : ''}`} onClick={() => setFiltroEstado(e)}>{e}</button>
                    ))}
                </div>
                <div className="category-pills">
                    {(['Todos', 'Compra', 'Venta'] as const).map((t) => (
                        <button key={t} className={`pill${filtroTipo === t ? ' active' : ''}`} onClick={() => setFiltroTipo(t as any)}>
                            {t === 'Todos' ? '📋 Todos' : t === 'Compra' ? '🛒 Compra' : '💰 Venta'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla */}
            <div className="table-wrap">
                {lista.length === 0 ? (
                    <div className="fact-empty">📄 No hay facturas para mostrar.<br /><span>Usá "➕ Nueva Factura" para registrar una.</span></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Tipo</th>
                                <th>Proveedor / Cliente</th>
                                <th>Descripción</th>
                                <th>Monto</th>
                                <th>Emisión</th>
                                <th>Vencimiento</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((f) => (
                                <tr key={f.id}>
                                    <td><strong>{f.numero}</strong>{f.imagen_url && <span className="img-badge" title="Tiene foto adjunta"> 📎</span>}</td>
                                    <td>
                                        <span className={`tipo-badge ${f.tipo === 'Compra' ? 'tipo-compra' : 'tipo-venta'}`}>
                                            {f.tipo === 'Compra' ? '🛒' : '💰'} {f.tipo}
                                        </span>
                                    </td>
                                    <td>{f.proveedor_cliente}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{f.descripcion}</td>
                                    <td><strong>{fmtMoney(f.monto_total)}</strong></td>
                                    <td style={{ fontSize: '0.85rem' }}>{fmtDate(f.fecha_emision)}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{fmtDate(f.fecha_vencimiento)}</td>
                                    <td>
                                        <span className={`estado-badge ${ESTADO_CONFIG[f.estado].color}`}>
                                            {ESTADO_CONFIG[f.estado].icon} {f.estado}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="fact-actions">
                                            {(f.estado === EstadoFactura.PorPagar || f.estado === EstadoFactura.Vencida) && (
                                                <button className="btn-xs btn-ok" onClick={() => handleMarcarPagada(f)}>✅ Pagada</button>
                                            )}
                                            {f.estado !== EstadoFactura.Anulada && f.estado !== EstadoFactura.Pagada && (
                                                <button className="btn-xs btn-danger" onClick={() => handleAnular(f)}>🚫 Anular</button>
                                            )}
                                            <button className="btn-xs" onClick={() => setDetalle(f)}>👁 Ver</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Nueva Factura */}
            {modal && <NuevaFacturaModal onClose={() => setModal(false)} addToast={addToast} onSave={refresh} />}

            {/* Modal Detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal">
                        <div className="modal-title">🧾 Detalle Factura</div>
                        <div className="modal-body">
                            <div className="detalle-grid">
                                <div className="detalle-item"><span>Número</span><strong>{detalle.numero}</strong></div>
                                <div className="detalle-item"><span>Tipo</span><strong>{detalle.tipo}</strong></div>
                                <div className="detalle-item"><span>Proveedor / Cliente</span><strong>{detalle.proveedor_cliente}</strong></div>
                                <div className="detalle-item"><span>Descripción</span><strong>{detalle.descripcion}</strong></div>
                                <div className="detalle-item"><span>Monto Total</span><strong style={{ color: 'var(--accent)' }}>{fmtMoney(detalle.monto_total)}</strong></div>
                                <div className="detalle-item"><span>Fecha Emisión</span><strong>{fmtDate(detalle.fecha_emision)}</strong></div>
                                <div className="detalle-item"><span>Fecha Vencimiento</span><strong>{fmtDate(detalle.fecha_vencimiento)}</strong></div>
                                <div className="detalle-item"><span>Estado</span>
                                    <span className={`estado-badge ${ESTADO_CONFIG[detalle.estado].color}`}>{ESTADO_CONFIG[detalle.estado].icon} {detalle.estado}</span>
                                </div>
                                {detalle.notas && <div className="detalle-item full"><span>Notas</span><strong>{detalle.notas}</strong></div>}
                                {detalle.imagen_url && (
                                    <div className="detalle-item full">
                                        <span>📎 Foto adjunta</span>
                                        <a href={detalle.imagen_url} target="_blank" rel="noopener noreferrer" className="img-view-link">
                                            <img src={detalle.imagen_url} alt="Factura" className="img-detalle" />
                                            <span className="img-view-hint">Clic para ver en tamaño completo</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Modal Nueva Factura ───────────────────────────────
function NuevaFacturaModal({ onClose, addToast, onSave }: {
    onClose: () => void;
    addToast: (m: string, t: ToastType) => void;
    onSave: () => void;
}) {
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({
        numero: '', tipo: 'Compra' as TipoFactura,
        proveedor_cliente: '', descripcion: '',
        monto_total: '', fecha_emision: today, fecha_vencimiento: '', notas: '',
    });
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    // Auto-número
    const nextNum = `FAC-${String(getFacturas().length + 1).padStart(3, '0')}`;
    const [numAuto] = useState(nextNum);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { addToast('⚠️ La imagen no puede superar los 5MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImagenPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const save = () => {
        if (!form.proveedor_cliente.trim()) { addToast('⚠️ Ingresar proveedor/cliente', 'error'); return; }
        if (!form.monto_total || parseFloat(form.monto_total) <= 0) { addToast('⚠️ Monto inválido', 'error'); return; }
        if (!form.fecha_vencimiento) { addToast('⚠️ Ingresar fecha de vencimiento', 'error'); return; }
        agregarFactura({
            numero: form.numero.trim() || numAuto,
            tipo: form.tipo,
            proveedor_cliente: form.proveedor_cliente.trim(),
            descripcion: form.descripcion.trim(),
            monto_total: parseFloat(form.monto_total),
            fecha_emision: form.fecha_emision,
            fecha_vencimiento: form.fecha_vencimiento,
            estado: EstadoFactura.PorPagar,
            notas: form.notas.trim() || undefined,
            imagen_url: imagenPreview ?? undefined,
        });
        addToast(`✅ Factura ${form.numero || numAuto} registrada`, 'success');
        onSave();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 580 }}>
                <div className="modal-title">🧾 Nueva Factura</div>
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Número de Factura</div>
                            <input className="form-input" placeholder={numAuto} value={form.numero} onChange={set('numero')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">Tipo *</div>
                            <select className="form-input" value={form.tipo} onChange={set('tipo')}>
                                <option value="Compra">🛒 Compra (a proveedor)</option>
                                <option value="Venta">💰 Venta (a cliente)</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="form-label">Proveedor / Cliente *</div>
                        <input className="form-input" placeholder="Ej: Royal Canin S.A." value={form.proveedor_cliente} onChange={set('proveedor_cliente')} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Descripción</div>
                        <input className="form-input" placeholder="Ej: Compra de alimentos mes de marzo" value={form.descripcion} onChange={set('descripcion')} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Monto Total *</div>
                        <input className="form-input" type="number" min="0" step="0.01" placeholder="0" value={form.monto_total} onChange={set('monto_total')} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Fecha Emisión *</div>
                            <input className="form-input" type="date" value={form.fecha_emision} onChange={set('fecha_emision')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">Fecha Vencimiento *</div>
                            <input className="form-input" type="date" value={form.fecha_vencimiento} onChange={set('fecha_vencimiento')} />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="form-label">Notas (opcional)</div>
                        <textarea className="form-input" rows={2} placeholder="Observaciones..." value={form.notas} onChange={set('notas')} />
                    </div>

                    {/* ── Foto de la factura ── */}
                    <div className="form-group">
                        <div className="form-label">📎 Foto de la Factura (opcional)</div>
                        <div
                            className={`img-upload-zone${imagenPreview ? ' has-image' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagenPreview ? (
                                <>
                                    <img src={imagenPreview} alt="Vista previa" className="img-preview" />
                                    <button
                                        className="img-remove-btn"
                                        onClick={(e) => { e.stopPropagation(); setImagenPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    >✕ Quitar</button>
                                </>
                            ) : (
                                <div className="img-upload-placeholder">
                                    <span className="img-upload-icon">📷</span>
                                    <span>Hacé clic para subir una foto</span>
                                    <span className="img-upload-hint">JPG, PNG, WEBP — máx. 5MB</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={save}>✅ Guardar Factura</button>
                </div>
            </div>
        </div>
    );
}
