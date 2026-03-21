import React, { useState, useCallback, useEffect } from 'react';
import {
    db, fmtMoney, checkout, cargarStock, agregarProducto, editarProducto, abrirSaco,
    getReporteDiario, getReporteSemanal, getReporteMensual, getProducto, getEspecies, getCategorias,
    agregarFactura, actualizarEstadoFactura, getFacturas, editarFactura, pagarFactura, cancelarPago,
    crearCliente, editarCliente, crearPedido, getPedidos, editarPedido, actualizarEstadoPedido, getClientes,
    MetodoPago, EstadoFactura, EstadoPedido, type Producto, type ItemCarrito, type Factura, type TipoFactura, type ItemFactura, type Cliente, type Pedido,
    reactivarFactura, syncFromCloud, getClienteByPhone, eliminarFactura, wakeUpSupabase, formatCLP, parseCLP,
    formatDecimalCLP, parseDecimalCLP, formatTypingCLP
} from './pos';
import { supabase } from './supabaseClient';

// ── Tipos locales ─────────────────────────────────────
type Tab = 'pos' | 'inventory' | 'ordenes' | 'pedidos' | 'clientes' | 'analitica' | 'facturas' | 'auditoria';
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; msg: string; type: ToastType; }
interface User { email: string; name: string; }
const ADMIN_EMAIL = 'mauricio.iturra.martinez23@gmail.com';
const isAdmin = (user: User | null) => user?.email === ADMIN_EMAIL;

// Extender tipos para UI (si es necesario alguno que no esté en pos.ts)
// ItemCarrito ya viene de pos.ts con UUID

// ═══════════════════════════════════════════════════════
// COMPONENTES DE APOYO
// ═══════════════════════════════════════════════════════

function LoginScreen({ onLogin, addToast }: { 
    onLogin: (u: User) => void;
    addToast: (msg: string, type: ToastType) => void;
}) {
    const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);

    // Ping a Supabase al montar para "despertar" el servidor (reduce cold start)
    useEffect(() => { wakeUpSupabase(); }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) {
                onLogin({ email: data.user.email!, name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0] });
            }
        } catch (err: any) {
            addToast(`❌ Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: { full_name: nombre.trim() }
                }
            });
            if (error) throw error;
            addToast('📩 ¡Registro exitoso! Por favor revisa tu correo para confirmar tu cuenta.', 'info');
            setView('login');
        } catch (err: any) {
            addToast(`❌ Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (error) throw error;
            addToast('📧 Se ha enviado un link de recuperación a tu correo.', 'info');
            setView('login');
        } catch (err: any) {
            addToast(`❌ Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <img src="logo.png" alt="" style={{ maxHeight: '60px', borderRadius: '8px', display: 'block' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '1px' }}>
                            FJ <span style={{ color: 'var(--accent)' }}>MASCOTAS</span>
                        </div>
                    </div>
                    <div className="login-subtitle">
                        {view === 'login' ? 'Sistema de Gestión de Ventas' : 
                         view === 'signup' ? 'Crear Cuenta Nueva' : 'Recuperar Contraseña'}
                    </div>
                </div>

                {view === 'login' && (
                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">Email / Gmail</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="ejemplo@gmail.com" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Cargando...' : 'Iniciar Sesión'}
                        </button>
                        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <a href="#" style={{ color: 'var(--accent)' }} onClick={(e) => { e.preventDefault(); setView('reset'); }}>¿Olvidaste tu contraseña?</a>
                            <span style={{ color: 'var(--muted)' }}>¿No tienes cuenta? <a href="#" style={{ color: 'var(--accent)' }} onClick={(e) => { e.preventDefault(); setView('signup'); }}>Regístrate aquí</a></span>
                        </div>
                    </form>
                )}

                {view === 'signup' && (
                    <form className="login-form" onSubmit={handleSignUp}>
                        <div className="form-group">
                            <label className="form-label">Nombre Completo</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Mauri"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email / Gmail</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="ejemplo@gmail.com" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="Mínimo 6 caracteres" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                required 
                            />
                        </div>
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Registrando...' : 'Crear Cuenta'}
                        </button>
                        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--muted)' }}>¿Ya tienes cuenta? <a href="#" style={{ color: 'var(--accent)' }} onClick={(e) => { e.preventDefault(); setView('login'); }}>Inicia sesión</a></span>
                        </div>
                    </form>
                )}

                {view === 'reset' && (
                    <form className="login-form" onSubmit={handleReset}>
                        <div className="form-group">
                            <label className="form-label">Tu Email</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="ejemplo@gmail.com" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Link de Recuperación'}
                        </button>
                        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.9rem' }}>
                            <a href="#" style={{ color: 'var(--accent)' }} onClick={(e) => { e.preventDefault(); setView('login'); }}>Volver al Login</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════
export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [tab, setTab] = useState<Tab>('pos');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [syncing, setSyncing] = useState(false);

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

    // Manejar sesión de Supabase
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser({ 
                    email: session.user.email!, 
                    name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0] 
                });
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setCurrentUser({ 
                    email: session.user.email!, 
                    name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0] 
                });
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Inicializar datos desde la nube en segundo plano (sin bloquear la UI)
    useEffect(() => {
        if (!currentUser) return;
        const init = async () => {
            try {
                setSyncing(true);
                await syncFromCloud();
                // Forzar re-render después de sincronizar
                setRefresh((r) => r + 1);
            } catch (error) {
                addToast('❌ Error al sincronizar con la nube', 'error');
            } finally {
                setSyncing(false);
            }
        };
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addToast, currentUser]);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <LoginScreen onLogin={setCurrentUser} addToast={addToast} />;
    }

    return (
        <div className="layout">
            <div className="topbar">
                <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="logo.png" alt="" style={{ maxHeight: '35px', borderRadius: '6px', display: 'block' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                        FJ <span style={{ color: 'var(--accent)' }}>MASCOTAS</span>
                    </div>
                </div>
                <div className="nav-tabs">
                    {([
                        ['pos', '🛒', 'Venta'], 
                        ['pedidos', '🛵', 'Pedidos'], 
                        ['clientes', '👥', 'Clientes'], 
                        ['inventory', '📦', 'Inventario'], 
                        ['ordenes', '📝', 'Órdenes'], 
                        ['analitica', '📊', 'Analítica'], 
                        ['facturas', '🧾', 'Facturas'],
                        ['auditoria', '🔍', 'Auditoría']
                    ] as const).filter(([id]) => {
                        if (id === 'analitica' || id === 'auditoria') return isAdmin(currentUser);
                        return true;
                    }).map(([id, icon, label]) => (
                        <button key={id} className={`nav-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
                            <span className="tab-icon">{icon}</span>{label}
                        </button>
                    ))}
                </div>
                <div className="topbar-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{currentUser.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {syncing ? '🔄 Sincronizando...' : 'Sesión iniciada'}
                            </span>
                        </div>
                        <button className="btn-logout" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={handleLogout}>Cerrar Sesión</button>
                    </div>
                    <div className="date-badge">{dateStr}</div>
                </div>
            </div>

            {/* SCREENS */}
            <main className="main-content">
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
                {tab === 'analitica' && isAdmin(currentUser) && <AnaliticaScreen key={refresh} />}
                {tab === 'auditoria' && isAdmin(currentUser) && <AuditoriaScreen key={refresh} />}
                {tab === 'facturas' && <FacturasScreen key={refresh} addToast={addToast} userName={currentUser.name} />}
                {tab === 'pedidos' && <PedidosScreen key={refresh} addToast={addToast} />}
                {tab === 'clientes' && <ClientesScreen key={refresh} addToast={addToast} />}
                {tab === 'ordenes' && <PurchaseOrderScreen key={refresh} addToast={addToast} />}
            </main>

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
        </div>
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
    const BANCOS_CHILE = ['Banco de Chile', 'Banco Estado', 'BCI', 'Santander', 'Itaú', 'Scotiabank', 'Banco Falabella', 'Banco Ripley', 'Tenpo', 'Mach', 'Otro'];
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [query, setQuery] = useState('');
    const [especieFilter, setEspecieFilter] = useState('Todos');
    const [catFilter, setCatFilter] = useState('Todos');
    const [tipoGranelFilter, setTipoGranelFilter] = useState<'Todos' | 'Suelto' | 'Saco'>('Todos');
    const [sortBy, setSortBy] = useState<'nombre' | 'precio_asc' | 'precio_desc' | 'peso_asc' | 'peso_desc'>('nombre');
    const [metodo, setMetodo] = useState<MetodoPago>(MetodoPago.Efectivo);
    const [banco, setBanco] = useState('');
    const [granelModal, setGranelModal] = useState<Producto | null>(null);
    const [pedidoModal, setPedidoModal] = useState(false);

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
            const matchGranel = tipoGranelFilter === 'Todos' 
                || (tipoGranelFilter === 'Suelto' && p.venta_a_granel)
                || (tipoGranelFilter === 'Saco' && (!p.venta_a_granel && p.kilos_por_saco !== undefined));
            return matchQ && matchEsp && matchCat && matchGranel;
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
        if (prod.stock_actual <= 0) {
            addToast('⚠️ No hay más stock disponible', 'error');
            return;
        }
        
        if (prod.venta_a_granel) {
            setGranelModal(prod);
            return;
        }

        setCarrito((prev) => {
            const existing = prev.find((i) => i.id === prod.id);
            if (existing) {
                if (existing.qty >= prod.stock_actual) { addToast('⚠️ Stock máximo alcanzado', 'error'); return prev; }
                return prev.map((i) => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio_venta, qty: 1, emoji: prod.emoji }];
        });
    };

    const changeQty = (id: string, delta: number) => {
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

    const handleCheckout = async () => {
        if ((metodo === MetodoPago.Transferencia || metodo === MetodoPago.Tarjeta) && !banco) {
            addToast('⚠️ Por favor seleccione un banco', 'error');
            return;
        }
        const result = await checkout(carrito, metodo, banco);
        if (!result.ok) { addToast(`❌ ${result.error}`, 'error'); return; }
        setCarrito([]);
        setBanco('');
        flashSuccess();
        addToast(`✅ Venta #${result.ventaId} registrada — ${fmtMoney(result.total!)}`, 'success');
        onSaleComplete();
    };

    const total = carrito.reduce((s, i) => s + i.qty * i.precio, 0);
    const count = carrito.length; // Contar lineas, no qty porque hay decimales

    const handleGranelSubmit = (prod: Producto, kilos: number) => {
        if (kilos <= 0) return;
        if (kilos > prod.stock_actual) {
            addToast(`⚠️ Solo quedan ${prod.stock_actual} kg en stock`, 'error');
            return;
        }
        setCarrito((prev) => {
            const existing = prev.find((i) => i.id === prod.id);
            if (existing) {
                return prev.map((i) => i.id === prod.id ? { ...i, qty: kilos } : i);
            }
            return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio_venta, qty: kilos, emoji: prod.emoji, isGranel: true }];
        });
        setGranelModal(null);
    };

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

                {/* Filtro por tipo de venta (Suelto vs Saco) */}
                <div className="filter-row">
                    <span className="filter-label">Formato:</span>
                    <div className="category-pills">
                        {(['Todos', 'Suelto', 'Saco'] as const).map((tipo) => (
                            <button
                                key={tipo}
                                className={`pill${tipoGranelFilter === tipo ? ' active' : ''}`}
                                onClick={() => setTipoGranelFilter(tipo)}
                            >
                                {tipo === 'Todos' ? '🐾' : tipo === 'Suelto' ? '⚖️' : '🛍️'} {tipo}
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
                                    <div className="product-sku">
                                        {p.sku}{p.peso_kg && !p.venta_a_granel ? ` · ${p.peso_kg < 1 ? `${p.peso_kg * 1000}g` : `${p.peso_kg}kg`}` : ''}
                                        {p.venta_a_granel ? ' · ⚖️ A granel' : ''}
                                    </div>
                                    <div className="product-price">{fmtMoney(p.precio_venta)} {p.venta_a_granel ? '/ kg' : ''}</div>
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
                                    {item.isGranel ? (
                                        <button className="qty-btn" style={{ width: 'auto', padding: '0 8px', fontSize: '0.85rem' }} onClick={() => {
                                            const p = getProducto(item.id);
                                            if (p) setGranelModal(p);
                                        }}>
                                            ✏️ {item.qty} kg
                                        </button>
                                    ) : (
                                        <>
                                            <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                                            <span className="qty-num">{item.qty}</span>
                                            <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                                        </>
                                    )}
                                </div>
                                <span className="cart-item-price">{fmtMoney(item.qty * item.precio)}</span>
                                <button className="remove-btn" onClick={() => setCarrito((p) => p.filter((i) => i.id !== item.id))}>✕</button>
                            </div>
                        ))
                    )}
                </div>

                <hr className="cart-divider" />

                <div className="cart-total-row" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.9rem', color: 'var(--muted)' }}>
                        <span>Total Neto</span>
                        <span>{fmtMoney(total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.9rem', color: 'var(--muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '4px' }}>
                        <span>IVA (19%)</span>
                        <span>{fmtMoney(total * 0.19)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span className="total-label">Total con IVA</span>
                        <span className="total-amount" style={{ color: 'var(--accent)' }}>{fmtMoney(total * 1.19)}</span>
                    </div>
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
                    
                    {(metodo === MetodoPago.Transferencia || metodo === MetodoPago.Tarjeta) && (
                        <div style={{ marginTop: '12px' }}>
                            <div className="payment-label">Banco</div>
                            <select 
                                className="form-input" 
                                value={banco} 
                                onChange={(e) => setBanco(e.target.value)}
                                style={{ width: '100%', padding: '10px' }}
                            >
                                <option value="">-- Seleccionar Banco --</option>
                                {BANCOS_CHILE.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        className="checkout-btn"
                        disabled={carrito.length === 0}
                        onClick={handleCheckout}
                    >
                        🐾 FINALIZAR VENTA
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '16px', fontSize: '1rem', fontWeight: 'bold' }}
                        disabled={carrito.length === 0}
                        onClick={() => setPedidoModal(true)}
                    >
                        🛵 CREAR PEDIDO
                    </button>
                </div>
            </div>

            {granelModal && (
                <GranelModal
                    producto={granelModal}
                    initialQty={carrito.find(i => i.id === granelModal.id)?.qty}
                    onClose={() => setGranelModal(null)}
                    onSubmit={handleGranelSubmit}
                />
            )}

            {pedidoModal && (
                <PedidoModal
                    carrito={carrito}
                    total={total}
                    onClose={() => setPedidoModal(false)}
                    addToast={addToast}
                    onSuccess={() => {
                        setCarrito([]);
                        setPedidoModal(false);
                        flashSuccess();
                    }}
                />
            )}
        </div>
    );
}

// ── Modal Venta a Granel ────────────────────────────
function GranelModal({ producto, initialQty, onClose, onSubmit }: {
    producto: Producto;
    initialQty?: number;
    onClose: () => void;
    onSubmit: (p: Producto, kilos: number) => void;
}) {
    // Calculamos el valor inicial si ya estaba en el carrito
    const defaultKilos = initialQty ? initialQty.toString() : '';
    const defaultMonto = initialQty ? Math.round(initialQty * producto.precio_venta).toString() : '';

    const [kilosStr, setKilosStr] = useState(defaultKilos);
    const [montoStr, setMontoStr] = useState(defaultMonto);

    const parseLocalFloat = (val: string) => {
        const clean = val.replace(',', '.');
        return parseFloat(clean);
    };

    const handleKilosChange = (val: string) => {
        setKilosStr(val);
        const k = parseLocalFloat(val);
        if (!isNaN(k)) {
            setMontoStr(Math.round(k * producto.precio_venta).toString());
        } else {
            setMontoStr('');
        }
    };

    const handleMontoChange = (val: string) => {
        setMontoStr(val);
        const m = parseLocalFloat(val);
        if (!isNaN(m)) {
            const k = m / producto.precio_venta;
            setKilosStr(k.toFixed(3)); // Mostrar hasta 3 decimales
        } else {
            setKilosStr('');
        }
    };

    const submit = () => {
        const k = parseLocalFloat(kilosStr);
        if (!isNaN(k) && k > 0) {
            onSubmit(producto, k);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 400 }}>
                <div className="modal-title">⚖️ Vender {producto.nombre}</div>
                <div className="modal-body">
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                        Precio por Kilogramo: <strong>{fmtMoney(producto.precio_venta)}</strong><br/>
                        Stock disponible: <strong>{producto.stock_actual} kg</strong>
                    </p>
                    
                    <div className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <div className="form-label">Monto ($)</div>
                            <input
                                className="form-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="Ej: 2000"
                                value={montoStr}
                                onChange={(e) => handleMontoChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ padding: '0 16px', fontSize: '1.2rem', color: 'var(--muted)', marginBottom: 8 }}>
                            =
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <div className="form-label">Peso (Kilos)</div>
                            <input
                                className="form-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="Ej: 0,66"
                                value={kilosStr}
                                onChange={(e) => handleKilosChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={submit} disabled={!parseLocalFloat(kilosStr)}>✅ Agregar al carrito</button>
                </div>
            </div>
        </div>
    );
}

function InventoryScreen({ addToast, onRefresh }: {
    addToast: (m: string, t: ToastType) => void;
    onRefresh: () => void;
}) {
    const [stockModal, setStockModal] = useState<Producto | null>(null);
    const [addModal, setAddModal] = useState<boolean | Producto>(false);
    const [stockQty, setStockQty] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [tick, setTick] = useState(0);

    // ── Filtros ──
    const [query, setQuery] = useState('');
    const [especieFilter, setEspecieFilter] = useState('Todos');
    const [catFilter, setCatFilter] = useState('Todos');
    const [stockFilter, setStockFilter] = useState<'todos' | 'ok' | 'bajo' | 'sin'>('todos');
    const [tipoGranelFilter, setTipoGranelFilter] = useState<'Todos' | 'Suelto' | 'Saco'>('Todos');
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
            const matchGranel = tipoGranelFilter === 'Todos' 
                || (tipoGranelFilter === 'Suelto' && p.venta_a_granel)
                || (tipoGranelFilter === 'Saco' && (!p.venta_a_granel && p.kilos_por_saco !== undefined));
            return matchQ && matchEsp && matchCat && matchStock && matchGranel;
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

    const handleStockSave = async () => {
        const qty = parseInt(stockQty);
        if (!stockModal || !qty || qty <= 0) { addToast('⚠️ Ingresá una cantidad válida', 'error'); return; }
        await cargarStock(stockModal.id, qty, stockNote || 'Carga manual');
        addToast(`✅ +${qty} unidades agregadas a ${stockModal.nombre}`, 'success');
        setStockModal(null); setStockQty(''); setStockNote('');
        setTick((t) => t + 1); onRefresh();
    };

    const handleAbrirSaco = async (p: Producto) => {
        if (!confirm(`¿Estás seguro que deseas abrir 1 saco de ${p.nombre}?`)) return;
        const res = await abrirSaco(p.id);
        if (!res.ok) {
            addToast(`❌ Error: ${res.error}`, 'error');
        } else {
            addToast(`✅ Saco abierto correctamente. Se sumaron kilos al tambor.`, 'success');
            setTick((t) => t + 1); onRefresh();
        }
    };

    return (
        <div className="inv-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">📦 Inventario</div>
                <button className="btn-secondary" onClick={() => setAddModal(true)}>➕ Nuevo Producto</button>
            </div>

            {/* Stats — clickeables como filtro rápido de stock */}
            <div className="weekly-summary-cards" style={{ marginTop: 0, marginBottom: 16 }}>
                {([
                    { label: 'Total Productos', value: total, cls: '', key: 'todos' },
                    { label: 'Stock OK', value: ok, cls: 'success-card', key: 'ok' },
                    { label: 'Stock Bajo', value: stockBajo, cls: 'warning-card', key: 'bajo' }, /* need to add warning-card style to index.css later */
                    { label: 'Sin Stock', value: sinStock, cls: 'danger-card', key: 'sin' },
                ] as const).map((s) => (
                    <div
                        key={s.label}
                        className={`summary-card inv-stat-btn ${s.cls} ${stockFilter === s.key ? 'inv-stat-active' : ''}`}
                        onClick={() => setStockFilter(stockFilter === s.key ? 'todos' : s.key)}
                        style={{ padding: '20px 16px', cursor: 'pointer' }}
                    >
                        <div className="sc-label">{s.label}</div>
                        <div className="sc-value" style={{ 
                            color: s.key === 'ok' ? 'var(--success)' : s.key === 'bajo' ? 'var(--warn)' : s.key === 'sin' ? 'var(--danger)' : '' 
                        }}>{s.value}</div>
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

                {/* Filtro por tipo de venta (Suelto vs Saco) */}
                <div className="filter-row">
                    <span className="filter-label">Formato:</span>
                    <div className="category-pills">
                        {(['Todos', 'Suelto', 'Saco'] as const).map((tipo) => (
                            <button
                                key={tipo}
                                className={`pill${tipoGranelFilter === tipo ? ' active' : ''}`}
                                onClick={() => setTipoGranelFilter(tipo)}
                            >
                                {tipo === 'Todos' ? '🐾' : tipo === 'Suelto' ? '⚖️' : '🛍️'} {tipo}
                            </button>
                        ))}
                    </div>
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
                                    <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        <button className="btn-xs" style={{ whiteSpace: 'nowrap' }} onClick={() => { setStockModal(p); setStockQty(''); setStockNote(''); }}>
                                            📥 Cargar
                                        </button>
                                        <button className="btn-xs btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => setAddModal(p)}>
                                            ✏️ Editar
                                        </button>
                                        {p.id_producto_suelto && p.kilos_por_saco && p.stock_actual > 0 && (
                                            <button className="btn-xs btn-accent" style={{ whiteSpace: 'nowrap', backgroundColor: '#eab308', color: '#000' }} onClick={() => handleAbrirSaco(p)}>
                                                📦 Abrir Saco
                                            </button>
                                        )}
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

            {/* Modal: Producto */}
            {addModal && <ProductModal productoToEdit={typeof addModal === 'object' ? addModal : undefined} onClose={() => setAddModal(false)} addToast={addToast} onSave={() => { setTick((t) => t + 1); onRefresh(); }} />}
        </div>
    );
}

// ── Modal Agregar/Editar Producto ────────────────────────────
function ProductModal({ productoToEdit, onClose, addToast, onSave }: {
    productoToEdit?: Producto;
    onClose: () => void;
    addToast: (m: string, t: ToastType) => void;
    onSave: () => void;
}) {
    const isEdit = !!productoToEdit;
    const [form, setForm] = useState({
        nombre: productoToEdit?.nombre || '',
        sku: productoToEdit?.sku || '',
        pventa: productoToEdit?.precio_venta?.toString() || '',
        pcosto: productoToEdit?.precio_costo?.toString() || '',
        stock: productoToEdit?.stock_actual?.toString() || '',
        stockmin: productoToEdit?.stock_minimo?.toString() || '5',
        cat: productoToEdit?.categoria || '',
        especie: productoToEdit?.especie || 'Perro',
        emoji: productoToEdit?.emoji || '',
        imagen: productoToEdit?.imagen || '',
        peso_kg: productoToEdit?.peso_kg?.toString() || '',
        venta_a_granel: productoToEdit?.venta_a_granel || false,
        id_producto_suelto: productoToEdit?.id_producto_suelto?.toString() || '',
        kilos_por_saco: productoToEdit?.kilos_por_saco?.toString() || '',
        catCustom: ''
    });
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

    const save = async () => {
        if (!form.nombre.trim() || !form.pventa) { addToast('⚠️ Nombre y precio son obligatorios', 'error'); return; }
        
        const prodData = {
            nombre: form.nombre.trim(),
            sku: form.sku.trim() || (isEdit ? productoToEdit!.sku : `SKU-${Date.now()}`),
            precio_venta: parseFloat(form.pventa),
            precio_costo: parseFloat(form.pcosto) || 0,
            stock_actual: form.venta_a_granel ? parseFloat(form.stock) || 0 : parseInt(form.stock) || 0,
            stock_minimo: parseInt(form.stockmin) || 5,
            categoria: (form.cat === '+ NUEVA' ? form.catCustom.trim() : form.cat.trim()) || 'General',
            especie: form.especie || 'Perro',
            emoji: form.emoji.trim() || '🛍️',
            imagen: form.imagen.trim() || undefined,
            peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : undefined,
            venta_a_granel: form.venta_a_granel || undefined,
            id_producto_suelto: form.id_producto_suelto || undefined,
            kilos_por_saco: form.kilos_por_saco ? parseFloat(form.kilos_por_saco) : undefined,
        };

        if (isEdit) {
            await editarProducto(productoToEdit!.id, prodData as any);
            addToast(`✅ Producto "${form.nombre}" actualizado`, 'success');
        } else {
            await agregarProducto(prodData as any);
            addToast(`✅ Producto "${form.nombre}" agregado`, 'success');
        }

        onSave();
        onClose();
    };

    const productosGranel = db.productos.filter(p => p.venta_a_granel && p.id !== productoToEdit?.id);
    // Excluir 'Todos' que es un valor de filtro, no una categoría real
    const categoriasExistentes = getCategorias().filter(c => c !== 'Todos');

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* Modal con header y footer fijos, solo el body scrollea */}
            <div className="modal" style={{ width: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-title" style={{ flexShrink: 0 }}>{isEdit ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</div>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

                    {/* Sección granel arriba para que defina el contexto del resto */}
                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={form.venta_a_granel} onChange={set('venta_a_granel')} style={{ width: 18, height: 18, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 600 }}>⚖️ Producto a Granel</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Se vende suelto por kg. El stock representa kilos disponibles.</div>
                            </div>
                        </label>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Nombre *</div>
                            <input className="form-input" placeholder="Ej: Royal Canin Adulto 3kg" value={form.nombre} onChange={set('nombre')} autoFocus />
                        </div>
                        <div className="form-group">
                            <div className="form-label">SKU / Código</div>
                            <input className="form-input" placeholder="Ej: RC-AD-3" value={form.sku} onChange={set('sku')} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">{form.venta_a_granel ? 'Precio de Venta por Kg *' : 'Precio de Venta *'}</div>
                            <input className="form-input" type="number" placeholder="0" step="1" min="0" value={form.pventa} onChange={set('pventa')} />
                            {form.venta_a_granel && <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: 4 }}>💡 Este es el precio por cada kilogramo vendido</div>}
                        </div>
                        <div className="form-group">
                            <div className="form-label">Precio Costo</div>
                            <input className="form-input" type="number" placeholder="0" step="1" min="0" value={form.pcosto} onChange={set('pcosto')} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">{form.venta_a_granel ? 'Stock Inicial (kg)' : 'Stock Inicial (unidades)'}</div>
                            <input className="form-input" type="number" placeholder="0" min="0" step={form.venta_a_granel ? '0.5' : '1'} value={form.stock} onChange={set('stock')} />
                        </div>
                        <div className="form-group">
                            <div className="form-label">{form.venta_a_granel ? 'Stock Mínimo (kg)' : 'Stock Mínimo (unidades)'}</div>
                            <input className="form-input" type="number" placeholder="5" min="0" step={form.venta_a_granel ? '0.5' : '1'} value={form.stockmin} onChange={set('stockmin')} />
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
                            <select className="form-input" value={form.cat} onChange={set('cat')}>
                                <option value="">-- Seleccionar --</option>
                                {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="+ NUEVA">➕ Nueva categoría...</option>
                            </select>
                            {form.cat === '+ NUEVA' && (
                                <input className="form-input" style={{ marginTop: 8 }} placeholder="Nombre de la nueva categoría" value={form.catCustom} onChange={set('catCustom')} />
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <div className="form-label">Emoji (ícono)</div>
                            <input className="form-input" placeholder="🛍️" maxLength={2} value={form.emoji} onChange={set('emoji')} />
                        </div>
                        {!form.venta_a_granel && (
                            <div className="form-group">
                                <div className="form-label">Peso del producto (kg, opcional)</div>
                                <input className="form-input" type="number" placeholder="Ej: 3 o 0.5" step="0.1" min="0" value={form.peso_kg} onChange={set('peso_kg')} />
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <div className="form-label">URL de Foto (opcional)</div>
                        <input className="form-input" placeholder="https://..." value={form.imagen} onChange={set('imagen')} />
                    </div>

                    {!form.venta_a_granel && productosGranel.length > 0 && (
                        <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '0.85rem', marginBottom: 10, color: 'var(--muted)' }}>📦 ¿Este saco cerrado abastece a un producto a granel?</div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <div className="form-label">Producto a granel vinculado</div>
                                    <select className="form-input" value={form.id_producto_suelto} onChange={set('id_producto_suelto')}>
                                        <option value="">-- Ninguno --</option>
                                        {productosGranel.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <div className="form-label">Kilos por Saco</div>
                                    <input className="form-input" type="number" step="0.5" placeholder="Ej: 15" value={form.kilos_por_saco} onChange={set('kilos_por_saco')} disabled={!form.id_producto_suelto} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-actions" style={{ flexShrink: 0 }}>
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={save}>✅ Guardar Producto</button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// ANALÍTICA CONSOLIDADA
// ═══════════════════════════════════════════════════════
function AnaliticaScreen() {
    const [subTab, setSubTab] = useState<'diario' | 'semanal' | 'mensual'>('diario');

    return (
        <div className="analitica-screen" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="sub-navigation" style={{ display: 'flex', gap: '8px', background: 'var(--surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
                <button 
                    className={`nav-tab ${subTab === 'diario' ? 'active' : ''}`} 
                    onClick={() => setSubTab('diario')}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >📅 Diario</button>
                <button 
                    className={`nav-tab ${subTab === 'semanal' ? 'active' : ''}`} 
                    onClick={() => setSubTab('semanal')}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >📊 Semanal</button>
                <button 
                    className={`nav-tab ${subTab === 'mensual' ? 'active' : ''}`} 
                    onClick={() => setSubTab('mensual')}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >📈 Histórico / Mensual</button>
            </div>

            {subTab === 'diario' && <ReportScreen />}
            {subTab === 'semanal' && <WeeklyReportScreen />}
            {subTab === 'mensual' && <InformesScreen />}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// AUDITORIA SCREEN
// ═══════════════════════════════════════════════════════
function AuditoriaScreen() {
    const logs = db.auditoria;
    const [filtroModulo, setFiltroModulo] = useState('Todos');
    
    const modulos = ['Todos', ...Array.from(new Set(logs.map(l => l.modulo)))];
    const filtrados = filtroModulo === 'Todos' ? logs : logs.filter(l => l.modulo === filtroModulo);

    return (
        <div className="report-screen">
            <div className="screen-header">
                <div>
                    <div className="screen-title">🔍 Historial de Auditoría</div>
                    <div style={{ color: 'var(--muted)' }}>Seguimiento de acciones y cambios en el sistema</div>
                </div>
                <div className="date-filter-group">
                    <select 
                        className="date-input" 
                        value={filtroModulo} 
                        onChange={(e) => setFiltroModulo(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                        {modulos.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-wrap" style={{ marginTop: 20 }}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '180px' }}>Fecha</th>
                            <th style={{ width: '150px' }}>Usuario</th>
                            <th style={{ width: '120px' }}>Módulo</th>
                            <th style={{ width: '250px' }}>Acción</th>
                            <th>Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                                    No hay registros de auditoría para mostrar.
                                </td>
                            </tr>
                        ) : (
                            filtrados.map(log => (
                                <tr key={log.id}>
                                    <td style={{ fontSize: '0.85rem' }}>{new Date(log.fecha).toLocaleString('es-AR')}</td>
                                    <td>
                                        <span className="pill" style={{ background: 'rgba(129,140,248,0.1)', color: 'var(--accent)', border: '1px solid rgba(129,140,248,0.2)' }}>
                                            {log.usuario}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`estado-badge ${
                                            log.modulo === 'Ventas' ? 'success' : 
                                            log.modulo === 'Inventario' ? 'warn' : 
                                            log.modulo === 'Facturas' ? 'info' : 'primary'
                                        }`}>
                                            {log.modulo}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{log.accion}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{log.detalle}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                    <td>{dia.cantidadVentas}</td>
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
function FacturasScreen({ addToast, userName }: { addToast: (m: string, t: ToastType) => void; userName: string }) {
    const [tick, setTick] = useState(0);
    const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | 'Todos'>('Todos');
    const [query, setQuery] = useState('');
    const [modal, setModal] = useState<Factura | 'NUEVA' | null>(null);
    const [detalle, setDetalle] = useState<Factura | null>(null);
    const [confirmDeshacerId, setConfirmDeshacerID] = useState<string | null>(null);
    const [confirmAnularId, setConfirmAnularId] = useState<string | null>(null);
    const [confirmReactivarId, setConfirmReactivarId] = useState<string | null>(null);
    const [confirmEliminarId, setConfirmEliminarId] = useState<string | null>(null);
    const [facturaPendientePago, setFacturaPendientePago] = useState<Factura | null>(null);
    const [sortBy, setSortBy] = useState<'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc' | 'numero'>('fecha_desc');
    const [montoMin, setMontoMin] = useState('');
    const [montoMax, setMontoMax] = useState('');

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
        const matchQ = !query || f.numero.toLowerCase().includes(query.toLowerCase()) || f.proveedor_cliente.toLowerCase().includes(query.toLowerCase()) || f.descripcion.toLowerCase().includes(query.toLowerCase());
        
        const m = f.monto_total;
        const min = montoMin ? parseFloat(montoMin) : -Infinity;
        const max = montoMax ? parseFloat(montoMax) : Infinity;
        const matchMonto = m >= min && m <= max;

        return matchEstado && matchQ && matchMonto;
    }).sort((a, b) => {
        if (sortBy === 'fecha_desc') {
            const da = new Date(a.fecha_emision).getTime();
            const db2 = new Date(b.fecha_emision).getTime();
            if (db2 !== da) return db2 - da;
            return b.id.localeCompare(a.id);
        }
        if (sortBy === 'fecha_asc') {
            const da = new Date(a.fecha_emision).getTime();
            const db2 = new Date(b.fecha_emision).getTime();
            if (da !== db2) return da - db2;
            return a.id.localeCompare(b.id);
        }
        if (sortBy === 'monto_desc') return b.monto_total - a.monto_total;
        if (sortBy === 'monto_asc') return a.monto_total - b.monto_total;
        if (sortBy === 'numero') return a.numero.localeCompare(b.numero);
        return b.id.localeCompare(a.id);
    });

    const ESTADO_CONFIG: Record<EstadoFactura, { color: string; icon: string }> = {
        [EstadoFactura.PorPagar]: { color: 'estado-porpagar', icon: '🟡' },
        [EstadoFactura.Pagada]:   { color: 'estado-pagada',   icon: '🟢' },
        [EstadoFactura.Vencida]:  { color: 'estado-vencida',  icon: '🔴' },
        [EstadoFactura.Anulada]:  { color: 'estado-anulada',  icon: '⚫' },
    };

    const handleMarcarPagada = (f: Factura) => {
        setFacturaPendientePago(f);
    };

    const handleCancelarPago = (f: Factura) => {
        setConfirmDeshacerID(f.id);
    };

    const confirmarDeshacerPago = async (f: Factura) => {
        const ok = await cancelarPago(f.id, userName);
        if (ok) {
            addToast(`🔄 Factura ${f.numero} revertida a Por Pagar`, 'success');
        } else {
            addToast(`❌ Error al revertir factura ${f.numero}`, 'error');
        }
        setConfirmDeshacerID(null);
        refresh();
    };

    const handleAnular = (f: Factura) => {
        setConfirmAnularId(f.id);
    };

    const confirmarAnular = async (f: Factura) => {
        const ok = await actualizarEstadoFactura(f.id, EstadoFactura.Anulada, userName);
        if (ok) {
            addToast(`🚫 Factura ${f.numero} anulada`, 'success');
        } else {
            addToast(`❌ Error al anular factura ${f.numero}`, 'error');
        }
        setConfirmAnularId(null);
        refresh();
    };

    const handleReactivar = (f: Factura) => {
        setConfirmReactivarId(f.id);
    };

    const confirmarReactivar = async (f: Factura) => {
        const ok = await reactivarFactura(f.id, userName);
        if (ok) {
            addToast(`↩️ Factura ${f.numero} reactivada a Por Pagar`, 'success');
        } else {
            addToast(`❌ Error al reactivar factura ${f.numero}`, 'error');
        }
        setConfirmReactivarId(null);
        refresh();
    };

    const handleEliminar = (f: Factura) => {
        setConfirmEliminarId(f.id);
    };

    const confirmarEliminar = async (f: Factura) => {
        try {
            await eliminarFactura(f.id);
            addToast(`🗑️ Factura ${f.numero} eliminada`, 'success');
        } catch (err: any) {
            addToast(`❌ Error al eliminar: ${err.message}`, 'error');
        } finally {
            setConfirmEliminarId(null);
            refresh();
        }
    };

    const fmtDate = (iso: string) => {
        if (!iso) return '—';
        // Handle both "YYYY-MM-DD" and full ISO strings
        const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const renderDiasRestantes = (iso: string, estado: EstadoFactura) => {
        if (!iso || estado === EstadoFactura.Pagada || estado === EstadoFactura.Anulada) return null;
        
        const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
        const vencimiento = new Date(dateStr);
        if (isNaN(vencimiento.getTime())) return null;

        const hoy = new Date();
        hoy.setHours(12, 0, 0, 0);
        vencimiento.setHours(12, 0, 0, 0);

        const diffDays = Math.round((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return <div style={{ fontSize: '0.75rem', marginTop: 2, color: 'var(--danger)' }}>(Vencida hace {Math.abs(diffDays)} días)</div>;
        } else if (diffDays === 0) {
            return <div style={{ fontSize: '0.75rem', marginTop: 2, color: 'var(--warn)' }}>(Vence hoy)</div>;
        } else {
            const color = diffDays <= 3 ? 'var(--warn)' : 'var(--muted)';
            return <div style={{ fontSize: '0.75rem', marginTop: 2, color }}>({diffDays} días restantes)</div>;
        }
    };

    return (
        <div className="fact-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="screen-title">🧾 Facturas</div>
                    <button className="btn-secondary" title="Refrescar datos" onClick={async () => { await syncFromCloud(); refresh(); }}>🔄</button>
                </div>
                <button className="btn-primary" onClick={() => setModal('NUEVA')}>➕ Nueva Factura</button>
            </div>

            {/* Stats */}
            <div className="weekly-summary-cards" style={{ marginTop: 0, marginBottom: 16 }}>
                {[
                    { label: 'Total Registradas', value: totalFacturas, sub: 'facturas en el sistema', cls: '' },
                    { label: 'Por Pagar', value: porPagar.length, sub: fmtMoney(porPagar.reduce((s, f) => s + f.monto_total, 0)), cls: 'warning-card', color: 'var(--warn)' },
                    { label: 'Pagadas', value: pagadas.length, sub: fmtMoney(pagadas.reduce((s, f) => s + f.monto_total, 0)), cls: 'success-card', color: 'var(--success)' },
                    { label: 'Vencidas', value: vencidas.length, sub: fmtMoney(vencidas.reduce((s, f) => s + f.monto_total, 0)), cls: 'danger-card', color: 'var(--danger)' },
                    { label: 'Pendiente Total', value: fmtMoney(montoPendiente), sub: 'por pagar', cls: 'accent-card', color: 'var(--accent2)' },
                ].map((s) => (
                    <div key={s.label} className={`summary-card ${s.cls}`} style={{ padding: '20px 16px' }}>
                        <div className="sc-label">{s.label}</div>
                        <div className="sc-value" style={{ color: s.color, fontSize: typeof s.value === 'string' && s.value.includes('$') ? '2rem' : '3rem' }}>{s.value}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '8px' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="fact-filters">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="search-bar search-compact" style={{ flex: 1, minWidth: 250, margin: 0 }}>
                        <span>🔍</span>
                        <input type="text" placeholder="Número, proveedor/cliente..." value={query} onChange={(e) => setQuery(e.target.value)} />
                        {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
                    </div>

                    <select 
                        className="form-input" 
                        style={{ width: 'auto', minWidth: 220, marginBottom: 0, padding: '8px 12px', height: 42 }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="fecha_desc">📅 Fecha (Reciente → Antigua)</option>
                        <option value="fecha_asc">📅 Fecha (Antigua → Reciente)</option>
                        <option value="monto_desc">💰 Monto (Mayor → Menor)</option>
                        <option value="monto_asc">💰 Monto (Menor → Mayor)</option>
                        <option value="numero">🔢 Número de Factura</option>
                    </select>

                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 8, 
                        background: 'rgba(255,255,255,0.03)', padding: '0 12px', 
                        borderRadius: 8, border: '1px solid var(--border)',
                        height: 42
                    }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>MONTO:</span>
                        <input 
                            type="number" 
                            placeholder="Min" 
                            style={{ width: 70, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', fontSize: '0.85rem', outline: 'none' }}
                            value={montoMin} 
                            onChange={(e) => setMontoMin(e.target.value)} 
                        />
                        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>~</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            style={{ width: 70, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', fontSize: '0.85rem', outline: 'none' }}
                            value={montoMax} 
                            onChange={(e) => setMontoMax(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="category-pills">
                    {(['Todos', EstadoFactura.PorPagar, EstadoFactura.Pagada, EstadoFactura.Vencida, EstadoFactura.Anulada] as const).map((e) => (
                        <button key={e} className={`pill${filtroEstado === e ? ' active' : ''}`} onClick={() => setFiltroEstado(e)}>{e}</button>
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
                                <th>Proveedor</th>
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
                                    <td>{f.proveedor_cliente}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{f.descripcion}</td>
                                    <td><strong>{fmtMoney(f.monto_total)}</strong></td>
                                    <td style={{ fontSize: '0.85rem' }}>{fmtDate(f.fecha_emision)}</td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{fmtDate(f.fecha_vencimiento)}</div>
                                        {renderDiasRestantes(f.fecha_vencimiento, f.estado)}
                                    </td>
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
                                            {f.estado === EstadoFactura.Pagada && (
                                                confirmDeshacerId === f.id ? (
                                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--warn)', marginRight: 2 }}>¿Deshacer?</span>
                                                        <button className="btn-xs btn-danger" onClick={() => confirmarDeshacerPago(f)}>Sí</button>
                                                        <button className="btn-xs" onClick={() => setConfirmDeshacerID(null)}>No</button>
                                                    </span>
                                                ) : (
                                                    <button className="btn-xs btn-warn" onClick={() => handleCancelarPago(f)}>🔄 Deshacer Pago</button>
                                                )
                                            )}
                                            {f.estado !== EstadoFactura.Anulada && f.estado !== EstadoFactura.Pagada && (
                                                confirmAnularId === f.id ? (
                                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginRight: 2 }}>¿Anular?</span>
                                                        <button className="btn-xs btn-danger" onClick={() => confirmarAnular(f)}>Sí</button>
                                                        <button className="btn-xs" onClick={() => setConfirmAnularId(null)}>No</button>
                                                    </span>
                                                ) : (
                                                    <button className="btn-xs btn-danger" onClick={() => handleAnular(f)}>🚫 Anular</button>
                                                )
                                            )}
                                            {f.estado === EstadoFactura.Anulada && (
                                                confirmReactivarId === f.id ? (
                                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent2)', marginRight: 2 }}>¿Reactivar?</span>
                                                        <button className="btn-xs btn-ok" onClick={() => confirmarReactivar(f)}>Sí</button>
                                                        <button className="btn-xs" onClick={() => setConfirmReactivarId(null)}>No</button>
                                                    </span>
                                                ) : (
                                                    <button className="btn-xs" style={{ color: 'var(--accent2)', borderColor: 'rgba(129,140,248,0.4)' }} onClick={() => handleReactivar(f)}>↩️ Reactivar</button>
                                                )
                                            )}
                                            <button className="btn-xs" onClick={() => setModal(f)}>✏️ Editar</button>
                                            <button className="btn-xs" onClick={() => setDetalle(f)}>👁 Ver</button>
                                            {/* Eliminar con confirmación */}
                                            {confirmEliminarId === f.id ? (
                                                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginRight: 2 }}>¿Eliminar?</span>
                                                    <button className="btn-xs btn-danger" onClick={() => confirmarEliminar(f)}>Sí</button>
                                                    <button className="btn-xs" onClick={() => setConfirmEliminarId(null)}>No</button>
                                                </span>
                                            ) : (
                                                <button className="btn-xs btn-danger" style={{ opacity: 0.7 }} onClick={() => handleEliminar(f)}>🗑️ Eliminar</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Método de Pago */}
            {facturaPendientePago && (
                <PagoModal
                    factura={facturaPendientePago}
                    onClose={() => setFacturaPendientePago(null)}
                    onConfirm={async (metodo, banco, fecha) => {
                        const ok = await pagarFactura(facturaPendientePago.id, metodo, banco, userName, fecha, userName);
                        if (ok) {
                            addToast(`✅ Factura ${facturaPendientePago.numero} pagada (${metodo}${banco ? ` - ${banco}` : ''})`, 'success');
                        } else {
                            addToast(`❌ Error al registrar pago de factura ${facturaPendientePago.numero}`, 'error');
                        }
                        setFacturaPendientePago(null);
                        refresh();
                    }}
                />
            )}

            {/* Modal Factura (Nueva / Editar) */}
            {modal && <FacturaModal editItem={modal === 'NUEVA' ? undefined : modal} onClose={() => setModal(null)} addToast={addToast} onSave={refresh} userName={userName} />}

            {/* Modal Detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal">
                        <div className="modal-title">🧾 Detalle Factura</div>
                        <div className="modal-body">
                            <div className="detalle-grid">
                                <div className="detalle-item"><span>Número</span><strong>{detalle.numero}</strong></div>
                                <div className="detalle-item"><span>Proveedor</span><strong>{detalle.proveedor_cliente}</strong></div>
                                <div className="detalle-item"><span>Descripción</span><strong>{detalle.descripcion}</strong></div>
                                <div className="detalle-item"><span>Monto Total</span><strong style={{ color: 'var(--accent)' }}>{fmtMoney(detalle.monto_total)}</strong></div>
                                <div className="detalle-item"><span>Fecha Emisión</span><strong>{fmtDate(detalle.fecha_emision)}</strong></div>
                                <div className="detalle-item"><span>Fecha Vencimiento</span><strong>{fmtDate(detalle.fecha_vencimiento)}</strong></div>
                                <div className="detalle-item"><span>Estado</span>
                                    <span className={`estado-badge ${ESTADO_CONFIG[detalle.estado].color}`}>{ESTADO_CONFIG[detalle.estado].icon} {detalle.estado}</span>
                                </div>
                                {detalle.metodo_pago && (
                                    <div className="detalle-item">
                                        <span>Método de Pago</span>
                                        <strong>
                                            {detalle.metodo_pago === 'Efectivo' ? '💵' : detalle.metodo_pago === 'Transferencia' ? '🏦' : '💳'} {detalle.metodo_pago}
                                            {detalle.banco && ` — ${detalle.banco}`}
                                        </strong>
                                    </div>
                                )}
                                {detalle.fecha_pago && (
                                    <div className="detalle-item">
                                        <span>Fecha de Pago</span>
                                        <strong>{fmtDate(detalle.fecha_pago)}</strong>
                                    </div>
                                )}
                                {detalle.registrado_por && (
                                    <div className="detalle-item">
                                        <span>Creado por</span>
                                        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '1.2rem' }}>👤</span> {detalle.registrado_por}
                                        </strong>
                                    </div>
                                )}
                                {detalle.pagado_por && (
                                    <div className="detalle-item">
                                        <span>Pagado por</span>
                                        <strong style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)' }}>
                                            <span style={{ fontSize: '1.2rem' }}>✅</span> {detalle.pagado_por}
                                        </strong>
                                    </div>
                                )}
                                {detalle.notas && <div className="detalle-item full"><span>Notas</span><strong>{detalle.notas}</strong></div>}
                                {/* Ítems de la factura */}
                                {detalle.items && detalle.items.length > 0 && (
                                    <div className="detalle-item full" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                                        <span>📦 Ítems</span>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--muted)' }}>Concepto</th>
                                                    <th style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--muted)' }}>Cant.</th>
                                                    <th style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--muted)' }}>P. Unit.</th>
                                                    <th style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--muted)' }}>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detalle.items.map(it => (
                                                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '4px 6px' }}>{it.concepto}</td>
                                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{it.cantidad}</td>
                                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmtMoney(it.precio_unitario)}</td>
                                                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{fmtMoney(it.cantidad * it.precio_unitario)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {detalle.imagen_url && (
                                    <div className="detalle-item full">
                                        <span>📎 Foto adjunta</span>
                                        <a href={detalle.imagen_url} target="_blank" rel="noopener noreferrer" className="img-view-link">
                                            <img src={detalle.imagen_url} alt="Factura" className="img-detalle" />
                                            <span className="img-view-hint">Clic para ver en tamaño completo</span>
                                        </a>
                                    </div>
                                )}
                                {/* 📝 Historial de cambios */}
                                {detalle.historial && detalle.historial.length > 0 && (
                                    <div className="detalle-item full" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                                        <span>📋 Historial de Cambios</span>
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {[...detalle.historial].reverse().map((log, i) => {
                                                const d = new Date(log.fecha);
                                                const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                return (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', gap: 8 }}>
                                                        <span style={{ color: 'var(--fg)', flex: 1 }}>
                                                            <span style={{ marginRight: 6 }}>
                                                                {log.accion.includes('creada') ? '📄' : log.accion.includes('Pagada') ? '✅' : log.accion.includes('Anulada') || log.accion.includes('Anulación') ? '🚫' : log.accion.includes('deshecho') ? '🔄' : log.accion.includes('reactivada') ? '↩️' : '✏️'}
                                                            </span>
                                                            {log.accion}{log.detalle ? ` — ${log.detalle}` : ''}
                                                        </span>
                                                        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                                            {log.usuario && (
                                                                <span style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent2)', border: '1px solid rgba(129,140,248,0.25)', padding: '1px 7px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>
                                                                    👤 {log.usuario}
                                                                </span>
                                                            )}
                                                            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{dateStr}</span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

// ── Modal Método de Pago ────────────────────────────────────────
function PagoModal({ factura, onClose, onConfirm }: {
    factura: Factura;
    onClose: () => void;
    onConfirm: (metodo: string, banco: string, fecha: string) => void;
}) {
    const BANCOS_CHILE = ['Banco de Chile', 'Banco Estado', 'BCI', 'Santander', 'Itaú', 'Scotiabank', 'Banco Falabella', 'Banco Ripley', 'Tenpo', 'Mach', 'Otro'];
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [metodo, setMetodo] = useState('Efectivo');
    const [banco, setBanco] = useState('');

    const metodos: { label: string; icon: string; value: string }[] = [
        { label: 'Efectivo', icon: '💵', value: 'Efectivo' },
        { label: 'Transferencia', icon: '🏦', value: 'Transferencia' },
        { label: 'Tarjeta', icon: '💳', value: 'Tarjeta' },
    ];
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 420 }}>
                <div className="modal-title">✅ Registrar Pago</div>
                <div className="modal-body">
                    <div style={{ marginBottom: 16, color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                        Factura <strong>{factura.numero}</strong> — {fmtMoney(factura.monto_total)}
                    </div>
                    
                    <div className="form-group">
                        <div className="form-label">Fecha de Pago</div>
                        <input 
                            type="date" 
                            className="form-input" 
                            value={fecha} 
                            onChange={(e) => setFecha(e.target.value)} 
                        />
                    </div>

                    <div className="form-label" style={{ marginTop: 16, marginBottom: 8 }}>Método de Pago</div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                        {metodos.map(m => (
                            <button
                                key={m.value}
                                onClick={() => {
                                    setMetodo(m.value);
                                    if (m.value === 'Efectivo') setBanco('');
                                }}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                    padding: '14px 18px', border: '2px solid', 
                                    borderColor: metodo === m.value ? 'var(--accent)' : 'var(--border)',
                                    borderRadius: 12,
                                    background: metodo === m.value ? 'rgba(99,102,241,0.1)' : 'var(--surface)', 
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    color: 'var(--fg)', fontSize: '0.85rem', fontWeight: 600,
                                    flex: 1
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {(metodo === 'Transferencia' || metodo === 'Tarjeta') && (
                        <div className="form-group anim-fade-in">
                            <div className="form-label">Banco / Entidad</div>
                            <input 
                                className="form-input" 
                                list="bancos-chile-list"
                                placeholder="Ej: Banco Estado, Santander, Mercado Pago..."
                                value={banco} 
                                onChange={(e) => setBanco(e.target.value)}
                            />
                            <datalist id="bancos-chile-list">
                                {BANCOS_CHILE.map(b => <option key={b} value={b} />)}
                            </datalist>
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button 
                        className="btn-primary" 
                        onClick={() => {
                            if ((metodo === 'Transferencia' || metodo === 'Tarjeta') && !banco) {
                                alert('Por favor seleccione un banco');
                                return;
                            }
                            onConfirm(metodo, banco, fecha);
                        }}
                    >
                        ✅ Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Modal Factura (Nueva / Editar) ───────────────────────
function FacturaModal({ editItem, onClose, addToast, onSave, userName }: {
    editItem?: Factura;
    onClose: () => void;
    addToast: (m: string, t: ToastType) => void;
    onSave: () => void;
    userName: string;
}) {
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({
        numero: editItem?.numero || '', 
        proveedor_cliente: editItem?.proveedor_cliente || '', 
        descripcion: editItem?.descripcion || '',
        monto_total: editItem ? editItem.monto_total.toString() : '', 
        fecha_emision: editItem?.fecha_emision || today, 
        fecha_vencimiento: editItem?.fecha_vencimiento || '', 
        notas: editItem?.notas || '',
        descuento_global: editItem?.descuento_global?.toString() || '',
    });
    const [items, setItems] = useState<ItemFactura[]>(
        editItem?.items?.length ? editItem.items : []
    );
    const [imagenPreview, setImagenPreview] = useState<string | null>(editItem?.imagen_url || null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [excludedProviders, setExcludedProviders] = useState<string[]>(() => {
        const saved = localStorage.getItem('pos_excluded_providers');
        return saved ? JSON.parse(saved) : [];
    });

    const handleExcludeProvider = (name: string) => {
        const updated = [...excludedProviders, name];
        setExcludedProviders(updated);
        localStorage.setItem('pos_excluded_providers', JSON.stringify(updated));
        addToast(`✅ Sugerencia "${name}" oculta`, 'success');
    };

    // Sugerencias de productos (basado en inventario y facturas previas)
    const productSuggestions = Array.from(new Set([
        ...db.productos.map((p: Producto) => p.nombre),
        ...getFacturas().flatMap((f: Factura) => f.items?.map((it: ItemFactura) => it.concepto) || [])
    ]))
    .filter(name => name.toUpperCase() !== 'IVA')
    .slice(0, 8);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    // Auto-número
    const nextNum = `FAC-${String(getFacturas().length + 1).padStart(3, '0')}`;
    const [numAuto] = useState(editItem ? editItem.numero : nextNum);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { addToast('⚠️ La imagen no puede superar los 5MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImagenPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // Total calculado desde ítems (o manual si no hay ítems)
    const tieneItems = items.length > 0;
    const subtotalNeto = Math.round(tieneItems 
        ? items.reduce((s, it) => s + Math.round((it.cantidad * it.precio_unitario) - (it.descuento || 0)), 0)
        : (parseDecimalCLP(form.monto_total) || 0));
    const descuentoGlobal = Math.round(parseDecimalCLP(form.descuento_global) || 0);
    const valorNeto = subtotalNeto - descuentoGlobal;
    const iva = Math.round(valorNeto * 0.19);
    const totalConIva = valorNeto + iva;

    const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), concepto: '', cantidad: 1, precio_unitario: 0, descuento: undefined }]);
    const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
    const updateItem = (id: string, field: keyof ItemFactura, value: string | number | undefined) =>
        setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: (typeof value === 'string' && field !== 'id' && field !== 'concepto') ? Number(value) : value } : it));

    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.proveedor_cliente.trim()) { addToast('⚠️ Ingresar proveedor/cliente', 'error'); return; }
        
        if (!tieneItems && subtotalNeto <= 0) { addToast('⚠️ Agregá ítems o ingresá un monto', 'error'); return; }
        if (!form.fecha_vencimiento) { addToast('⚠️ Ingresar fecha de vencimiento', 'error'); return; }
        if (tieneItems && items.some(it => !it.concepto.trim())) { addToast('⚠️ Todos los ítems deben tener un concepto', 'error'); return; }

        setSaving(true);
        try {
            const data = {
                numero: form.numero.trim() || numAuto,
                tipo: 'Compra' as TipoFactura,
                proveedor_cliente: form.proveedor_cliente.trim(),
                descripcion: form.descripcion.trim(),
                monto_total: totalConIva,
                valor_neto: valorNeto,
                descuento_global: descuentoGlobal,
                fecha_emision: form.fecha_emision,
                fecha_vencimiento: form.fecha_vencimiento,
                notas: form.notas.trim() || undefined,
                imagen_url: imagenPreview ?? undefined,
                items: tieneItems ? items : undefined,
                estado: editItem?.estado || EstadoFactura.PorPagar
            };

            if (editItem) {
                const ok = await editarFactura(editItem.id, data, userName);
                if (!ok) { addToast('❌ Error al editar la factura. Verificá tu conexión.', 'error'); return; }
                addToast(`✅ Factura ${data.numero} actualizada`, 'success');
            } else {
                const result = await agregarFactura(data, userName);
                if (!result) { addToast('❌ Error al guardar la factura. Verificá tu conexión.', 'error'); return; }
                addToast(`✅ Factura ${data.numero} registrada`, 'success');
            }
            onSave();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content">
                <div className="modal-header">
                    <div className="modal-title">🧾 {editItem ? 'Editar Factura' : 'Nueva Factura'}</div>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
                </div>
                
                <div className="modal-body">
                    <div className="form-group">
                        <div className="form-label">Número de Factura</div>
                        <input className="form-input" placeholder={numAuto} value={form.numero} onChange={set('numero')} />
                    </div>
                    
                    <div className="form-group">
                        <div className="form-label">Proveedor / Cliente *</div>
                        <input 
                            className="form-input" 
                            placeholder="Ej: Royal Canin S.A." 
                            value={form.proveedor_cliente} 
                            onChange={set('proveedor_cliente')} 
                        />
                        {/* Sugerencias rápidas */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {Array.from(new Set(getFacturas().map(f => f.proveedor_cliente)))
                                .filter(name => !excludedProviders.includes(name))
                                .reverse() // Más recientes primero
                                .slice(0, 5) // Top 5
                                .map(name => (
                                    <button 
                                        key={name} 
                                        type="button"
                                        className="pill" 
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => setForm(f => ({ ...f, proveedor_cliente: name }))}
                                    >
                                        <span>{name}</span>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); handleExcludeProvider(name); }}
                                            style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger)', e.currentTarget.style.color = 'white')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = 'var(--muted)')}
                                        >✕</span>
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <div className="form-label">Descripción general (opcional)</div>
                        <input className="form-input" placeholder="Ej: Compra de alimentos mes de marzo" value={form.descripcion} onChange={set('descripcion')} />
                    </div>

                    {/* ── Tabla de Ítems ── */}
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div className="form-label" style={{ margin: 0 }}>📦 Ítems de la factura</div>
                            <button type="button" className="btn-accent-sm" onClick={addItem}>➕ Agregar ítem</button>
                        </div>
                        
                        {/* Sugerencias de PRODUCTOS rápidas */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Sugerencias:</span>
                                    {productSuggestions.map((p: string) => (
                                        <button 
                                            key={p} type="button" className="pill" 
                                            style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(255,255,255,0.03)' }}
                                            onClick={() => {
                                                const existe = db.productos.find((pr: Producto) => pr.nombre === p);
                                                const newItem: ItemFactura = { 
                                                    id: crypto.randomUUID(), 
                                                    concepto: p, 
                                                    cantidad: 1, 
                                                    precio_unitario: existe ? existe.precio_costo : 0,
                                                    descuento: undefined
                                                };
                                                setItems(prev => [...prev, newItem]);
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                        </div>
                        
                        {items.length === 0 ? (
                            <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                Sin ítems — podés ingresar el monto total manualmente abajo
                            </div>
                        ) : (
                            <div className="table-wrap" style={{ marginTop: 0 }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 650 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Concepto *</th>
                                            <th style={{ textAlign: 'center', padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', width: 100 }}>Cant.</th>
                                            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', width: 110 }}>P. Unit.</th>
                                            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', width: 100 }}>Desc.</th>
                                            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', width: 110 }}>Subtotal</th>
                                            <th style={{ width: 32 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it) => {
                                            const precioDisplay = (it as any)._precioStr ?? (it.precio_unitario === 0 ? '' : String(it.precio_unitario).replace('.', ','));
                                            const descDisplay = (it as any)._descStr ?? (it.descuento === undefined || it.descuento === null ? '' : String(it.descuento).replace('.', ','));
                                            
                                            return (
                                            <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '6px 4px' }}>
                                                    <input
                                                        className="form-input"
                                                        style={{ margin: 0, padding: '5px 8px', fontSize: '0.82rem' }}
                                                        placeholder="Concepto..."
                                                        list="product-suggestions-list"
                                                        value={it.concepto}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            updateItem(it.id, 'concepto', val);
                                                            const p = db.productos.find((pr: Producto) => pr.nombre === val);
                                                            if (p) updateItem(it.id, 'precio_unitario', p.precio_costo);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px 4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)', padding: '2px' }}>
                                                        <button 
                                                            type="button" 
                                                            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 6px', fontSize: '1rem' }}
                                                            onClick={() => updateItem(it.id, 'cantidad', Math.max(1, it.cantidad - 1))}
                                                        >－</button>
                                                        <input
                                                            className="form-input"
                                                            style={{ margin: 0, padding: '2px 0', border: 'none', fontSize: '0.82rem', textAlign: 'center', width: 40, background: 'transparent' }}
                                                            type="number" min="1" step="1"
                                                            value={it.cantidad}
                                                            onChange={e => updateItem(it.id, 'cantidad', Math.floor(Number(e.target.value)) || 1)}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 6px', fontSize: '1rem' }}
                                                            onClick={() => updateItem(it.id, 'cantidad', it.cantidad + 1)}
                                                        >＋</button>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '6px 4px' }}>
                                                    <input
                                                        className="form-input"
                                                        style={{ margin: 0, padding: '5px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="0"
                                                        value={precioDisplay}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9,]/g, '');
                                                            if ((val.match(/,/g) || []).length > 1) return;
                                                            updateItem(it.id, '_precioStr' as any, val);
                                                            if (val.endsWith(',')) return;
                                                            const numero = parseFloat(val.replace(',', '.'));
                                                            updateItem(it.id, 'precio_unitario', isNaN(numero) ? 0 : numero);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px 4px' }}>
                                                    <input
                                                        className="form-input"
                                                        style={{ margin: 0, padding: '5px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="0"
                                                        value={descDisplay}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9,]/g, '');
                                                            if ((val.match(/,/g) || []).length > 1) return;
                                                            updateItem(it.id, '_descStr' as any, val);
                                                            if (val.endsWith(',')) return;
                                                            const numero = parseFloat(val.replace(',', '.'));
                                                            updateItem(it.id, 'descuento', val === '' || isNaN(numero) ? undefined : numero);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)', fontSize: '0.88rem' }}>
                                                    {fmtMoney(Math.round((it.cantidad * it.precio_unitario) - (it.descuento || 0)))}
                                                </td>
                                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                                    <button type="button" onClick={() => removeItem(it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.1rem', lineHeight: 1 }}>✕</button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                    <datalist id="product-suggestions-list">
                                        {db.productos
                                            .filter(p => p.nombre.toUpperCase() !== 'IVA')
                                            .map((p: Producto) => (
                                                <option key={p.id} value={p.nombre} />
                                            ))}
                                    </datalist>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--border)' }}>
                                            <td colSpan={4} style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Subtotal Neto</td>
                                            <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--fg)', fontSize: '0.95rem' }}>{fmtMoney(subtotalNeto)}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Descuento Total</td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                                <input
                                                    className="form-input"
                                                    style={{ margin: 0, padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right', width: 110, display: 'inline-block' }}
                                                    type="text"
                                                    placeholder="0"
                                                    value={formatCLP(form.descuento_global)}
                                                    onChange={e => setForm(f => ({ ...f, descuento_global: parseDecimalCLP(e.target.value).toString() }))}
                                                />
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr style={{ borderTop: '1px solid var(--border)' }}>
                                            <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>Valor Neto</td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--fg)', fontSize: '0.95rem' }}>{fmtMoney(valorNeto)}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>IVA (19%)</td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--fg)', fontSize: '0.95rem' }}>{fmtMoney(iva)}</td>
                                            <td></td>
                                        </tr>
                                        <tr style={{ borderTop: '2px solid var(--border)' }}>
                                            <td colSpan={4} style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total con IVA</td>
                                            <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)', fontSize: '1.3rem' }}>{fmtMoney(totalConIva)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Monto manual (solo si no hay ítems) */}
                    {!tieneItems && (
                        <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div className="form-label">Subtotal Neto *</div>
                            <input 
                                className="form-input" 
                                type="text"
                                inputMode="decimal"
                                placeholder="0" 
                                value={form.monto_total} 
                                onChange={e => setForm(f => ({ ...f, monto_total: formatTypingCLP(e.target.value) }))} 
                            />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>Subtotal:</span>
                                    <span style={{ fontWeight: 600 }}>{fmtMoney(subtotalNeto)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>Descuento Total:</span>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            className="form-input"
                                            style={{ margin: 0, padding: '2px 8px', fontSize: '0.82rem', textAlign: 'right', width: 100 }}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={form.descuento_global}
                                            onChange={e => setForm(f => ({ ...f, descuento_global: formatTypingCLP(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                    <span style={{ color: 'var(--muted)' }}>Valor Neto:</span>
                                    <span style={{ fontWeight: 600 }}>{fmtMoney(valorNeto)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--muted)' }}>IVA (19%):</span>
                                    <span style={{ fontWeight: 600 }}>{fmtMoney(iva)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '6px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Total con IVA:</span>
                                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{fmtMoney(totalConIva)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
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
                                        type="button"
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
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                        {saving ? '⏳ Guardando...' : '✅ Guardar Factura'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// PURCHASE ORDER SCREEN (Órdenes de Compra)
// ═══════════════════════════════════════════════════════

interface POItem {
    id: string;
    nombre: string;
    emoji: string;
    qty: number;
    costo: number;
}

function PurchaseOrderScreen({ addToast }: {
    addToast: (m: string, t: ToastType) => void;
}) {
    // Inicializar con productos bajo stock
    const initItems = useCallback(() => {
        return db.productos
            .filter((p) => p.stock_actual <= p.stock_minimo)
            .map((p) => {
                const deficit = p.stock_minimo - p.stock_actual;
                // Sugerir pedir al menos 5 o lo que falte para llegar al mínimo
                const suggestedQty = deficit > 0 ? deficit + 5 : 5;
                return {
                    id: p.id,
                    nombre: p.nombre,
                    emoji: p.emoji,
                    qty: suggestedQty,
                    costo: p.precio_costo
                };
            });
    }, []);

    const [items, setItems] = useState<POItem[]>(initItems);
    const [searchTerm, setSearchTerm] = useState('');

    const searchResults = searchTerm.length > 0
        ? db.productos.filter(p => 
            (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            && !items.find(i => i.id === p.id)
          ).slice(0, 5)
        : [];

    const handleAddItem = (p: Producto) => {
        setItems([...items, { id: p.id, nombre: p.nombre, emoji: p.emoji, qty: p.stock_minimo || 5, costo: p.precio_costo }]);
        setSearchTerm('');
        addToast(`✅ ${p.nombre} agregado a la orden`, 'success');
    };

    const handleQtyChange = (id: string, delta: number) => {
        setItems(prev => prev.map(i => {
            if (i.id === id) {
                const newQty = Math.max(1, i.qty + delta);
                return { ...i, qty: newQty };
            }
            return i;
        }));
    };

    const handleRemove = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleCopyWhatsApp = () => {
        if (items.length === 0) {
            addToast('⚠️ La orden está vacía', 'error');
            return;
        }

        const dateStr = new Date().toLocaleDateString('es-AR');
        let text = `📝 *ORDEN DE COMPRA*\nFecha: ${dateStr}\n\n*Productos a pedir:*\n`;
        
        items.forEach(i => {
            text += `- ${i.qty}x ${i.emoji} ${i.nombre}\n`;
        });

        const totalCosto = items.reduce((sum, i) => sum + (i.qty * i.costo), 0);
        text += `\n*Costo Estimado:* ${fmtMoney(totalCosto)}\n`;

        navigator.clipboard.writeText(text).then(() => {
            addToast('✅ Copiado al portapapeles listo para WhatsApp', 'success');
        }).catch(() => {
            addToast('❌ Error al copiar, intenta manualmente', 'error');
        });
    };

    const totalLines = items.length;
    const totalEstCosto = items.reduce((sum, i) => sum + (i.qty * i.costo), 0);

    return (
        <div className="report-screen">
            <div className="screen-header" style={{ flexShrink: 0, marginBottom: 16 }}>
                <div className="screen-title">📝 Generar Orden de Compra</div>
                <button className="btn-secondary" onClick={() => { setItems(initItems()); addToast('🔄 Lista reiniciada a productos con bajo stock', 'info'); }}>
                    🔄 Reiniciar con Bajo Stock
                </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Revisá los productos con bajo stock u agregá nuevos que necesites reponer. Ajusta cantidades y copía la lista para enviar por WhatsApp a tus proveedores.
            </p>
               {/* Header Facturas */}
            <div className="po-layout" style={{ display: 'flex', gap: '20px', flexDirection: 'row', alignItems: 'flex-start' }}>
                {/* ── IZQUIERDA: Buscador y Sugerencias ── */}
                <div className="po-search-box" style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', flex: '1', minWidth: '300px' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>🔍 Agregar producto manual:</div>
                    <div className="search-bar search-compact" style={{ width: '100%', marginBottom: 12 }}>
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder="Nombre SKU del producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>}
                    </div>
                    {searchTerm && searchResults.length === 0 && (
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin resultados o ya agregado.</div>
                    )}
                    {searchResults.length > 0 && (
                        <div className="po-search-results" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {searchResults.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div>
                                        <span>{p.emoji} </span>
                                        <strong>{p.nombre}</strong>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Stock actual: {p.stock_actual} • Costo: {fmtMoney(p.precio_costo)}</div>
                                    </div>
                                    <button className="btn-accent-sm" onClick={() => handleAddItem(p)}>+ Añadir</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── DERECHA: Lista de Pedido ── */}
                <div className="po-list-box" style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', flex: '2', minWidth: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Lista de Pedido ({totalLines} items)</div>
                        <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1.1rem' }}>Total Est: {fmtMoney(totalEstCosto)}</div>
                    </div>

                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛒</div>
                            No hay productos en la orden de compra.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '8px' }}>
                            {items.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', gap: '12px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, lineHeight: 1.2 }}>{item.nombre}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>Costo: {fmtMoney(item.costo)} c/u</div>
                                    </div>
                                    
                                    <div className="qty-controls" style={{ background: 'var(--surface)', margin: 0, border: '1px solid var(--border)' }}>
                                        <button className="qty-btn" onClick={() => handleQtyChange(item.id, -1)}>−</button>
                                        <span className="qty-num" style={{ minWidth: 28 }}>{item.qty}</span>
                                        <button className="qty-btn" onClick={() => handleQtyChange(item.id, 1)}>+</button>
                                    </div>
                                    
                                    <div style={{ fontWeight: 600, width: '90px', textAlign: 'right', color: 'var(--accent2)' }}>
                                        {fmtMoney(item.qty * item.costo)}
                                    </div>

                                    <button className="remove-btn" onClick={() => handleRemove(item.id)} style={{ width: '32px', height: '32px' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                        <button 
                            className="btn-primary" 
                            style={{ padding: '12px 24px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}
                            onClick={handleCopyWhatsApp}
                            disabled={items.length === 0}
                        >
                            💬 Copiar Lista para WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// INFORMES SCREEN — Balance Mensual y KPIs
// ═══════════════════════════════════════════════════════
function InformesScreen() {
    const today = new Date();
    // input type="month" usa el formato YYYY-MM
    const [mesSeleccionado, setMesSeleccionado] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

    const [yearStr, monthStr] = mesSeleccionado.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const report = getReporteMensual(year, month);
    const nombreMes = new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    return (
        <div className="weekly-screen">
            <div className="screen-header">
                <div>
                    <div className="screen-title">📈 Informes & Balance</div>
                    <div style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>
                        KPIs y resúmenes del mes de {nombreMes}
                    </div>
                </div>
                <div className="date-filter-group">
                    <input
                        type="month"
                        className="date-input"
                        value={mesSeleccionado}
                        onChange={(e) => setMesSeleccionado(e.target.value)}
                        style={{ fontSize: '1.2rem', padding: '8px 12px' }}
                    />
                </div>
            </div>

            <div className="weekly-summary-cards">
                <div className="summary-card success-card">
                    <div className="sc-label">Total Ingresos (Ventas)</div>
                    <div className="sc-value" style={{ color: 'var(--success)' }}>{fmtMoney(report.totalVentas)}</div>
                </div>
                <div className="summary-card danger-card">
                    <div className="sc-label">Total Costos</div>
                    <div className="sc-value" style={{ color: 'var(--danger)' }}>{fmtMoney(report.totalCosto)}</div>
                </div>
                <div className="summary-card accent-card">
                    <div className="sc-label">Utilidad Bruta (Ganancia)</div>
                    <div className="sc-value" style={{ color: 'var(--accent)' }}>{fmtMoney(report.totalUtilidad)}</div>
                </div>
                <div className={`summary-card ${report.margenPromedio > 20 ? 'success-card' : ''}`}>
                    <div className="sc-label">Margen de Ganancia Promedio</div>
                    <div className="sc-value" style={{ color: report.margenPromedio > 20 ? 'var(--success)' : 'var(--warn)' }}>
                        {report.margenPromedio > 0 ? `${report.margenPromedio.toFixed(1)}%` : '0%'}
                    </div>
                </div>
                <div className="summary-card">
                    <div className="sc-label">Cantidad de Operaciones</div>
                    <div className="sc-value">{report.cantidadVentas}</div>
                </div>
            </div>

            {/* Nuevo: Desglose por Categoría de Venta */}
            <div className="weekly-summary-cards" style={{ marginTop: 16, background: 'var(--surface)', padding: 16, borderRadius: 12 }}>
                <div className="summary-card" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="sc-label">🛵 Ventas Pedidos</div>
                    <div className="sc-value" style={{ fontSize: '1.2rem' }}>{fmtMoney(report.desglose?.pedidos?.total || 0)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{report.desglose?.pedidos?.cantidad || 0} entregas</div>
                </div>
                <div className="summary-card" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="sc-label">⚖️ Ventas a Granel (Kilo)</div>
                    <div className="sc-value" style={{ fontSize: '1.2rem' }}>{fmtMoney(report.desglose?.kilo?.total || 0)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{report.desglose?.kilo?.cantidad || 0} ventas</div>
                </div>
                <div className="summary-card" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                    <div className="sc-label">🛍️ Ventas Sacos Cerrados</div>
                    <div className="sc-value" style={{ fontSize: '1.2rem' }}>{fmtMoney(report.desglose?.saco?.total || 0)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{report.desglose?.saco?.cantidad || 0} sacos</div>
                </div>
            </div>

            {report.cantidadVentas === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 12, marginTop: 16 }}>
                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
                    No hay registros de ventas para el mes seleccionado.
                </div>
            ) : (
                <div style={{ marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {/* Insights o KPIs adicionales */}
                    {report.topProducto && (
                        <div className="insight-card">
                            <div style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🏅 Producto Estrella del Mes</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ fontSize: '3.5rem' }}>{report.topProducto.emoji}</div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>{report.topProducto.nombre}</h3>
                                    <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{fmtMoney(report.topProducto.totalBruto)} recaudados</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>{report.topProducto.cantidad} unidades vendidas según detalle</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="insight-card">
                        <div style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>💡 Análisis de Rentabilidad</div>
                        <ul style={{ margin: 0, paddingLeft: 24, color: 'var(--text)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                            <li>Tu ganancia bruta representa el <strong style={{color: 'var(--accent)'}}>{report.margenPromedio.toFixed(1)}%</strong> de tus ingresos.</li>
                            <li>En promedio, cada cliente gasta <strong style={{color: 'var(--accent2)'}}>{fmtMoney(report.ticketPromedio)}</strong>.</li>
                            <li>Registraste <strong>{report.cantidadVentas}</strong> ventas separadas este mes.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Modal Pedido (Delivery) ──────────────────────────────
function PedidoModal({ carrito, total, onClose, addToast, onSuccess }: {
    carrito: ItemCarrito[];
    total: number;
    onClose: () => void;
    addToast: (m: string, t: ToastType) => void;
    onSuccess: () => void;
}) {
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notaDelivery, setNotaDelivery] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.Efectivo);

    const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);

    // Auto-fill si existe
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTelefono(val);
        const existente = db.clientes.find(c => c.telefono === val);
        if (existente) {
            setClienteEncontrado(existente);
            setNombre(existente.nombre);
            setDireccion(existente.direccion);
        } else {
            setClienteEncontrado(null);
            // No blanqueamos nombre y dirección para que el usuario pueda seguir tipeando
        }
    };

    const handleCrearPedido = async () => {
        if (!telefono.trim() || !nombre.trim() || !direccion.trim()) {
            addToast('⚠️ Teléfono, nombre y dirección son obligatorios', 'error');
            return;
        }

        let clienteId = clienteEncontrado?.id;
        if (!clienteId) {
            // crear nuevo cliente
            const nuevoObj = await crearCliente({
                telefono: telefono.trim(),
                nombre: nombre.trim(),
                direccion: direccion.trim(),
                notas: ''
            });
            if (!nuevoObj) {
                addToast('❌ Error al crear el cliente', 'error');
                return;
            }
            clienteId = nuevoObj.id;
        } else {
            // actualizar dirección por si cambió
            await editarCliente(clienteId, { nombre: nombre.trim(), direccion: direccion.trim() });
        }

        await crearPedido({
            id_cliente: clienteId,
            items: carrito,
            total,
            estado: EstadoPedido.Pendiente,
            metodo_pago: metodoPago,
            nota_delivery: notaDelivery
        });

        addToast('🛵 ¡Pedido creado exitosamente!', 'success');
        onSuccess();
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '500px' }}>
                <div className="modal-title">🛵 Crear Pedido a Domicilio</div>
                <div className="modal-body">
                    <div className="form-group">
                        <div className="form-label">Teléfono (WhatsApp)</div>
                        <input className="form-input" placeholder="Ej: +56 9 1234 5678" value={telefono} onChange={handlePhoneChange} autoFocus />
                        {clienteEncontrado && <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: 4 }}>✓ Cliente existente encontrado</div>}
                    </div>
                    <div className="form-group">
                        <div className="form-label">Nombre del Cliente</div>
                        <input className="form-input" placeholder="Ej: Juan Pérez" value={nombre} onChange={e => setNombre(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Dirección de Entrega</div>
                        <input className="form-input" placeholder="Ej: Pasaje Los Alerces 123, Villa Sur" value={direccion} onChange={e => setDireccion(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Notas para el repartidor</div>
                        <textarea className="form-input" placeholder="Ej: Timbre no funciona, tocar la puerta" rows={2} value={notaDelivery} onChange={e => setNotaDelivery(e.target.value)} />
                    </div>
                    
                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <div className="form-label">Forma de Pago (Total: {fmtMoney(total)})</div>
                        <div className="payment-methods" style={{ display: 'flex', gap: '8px' }}>
                            {([MetodoPago.Efectivo, MetodoPago.Transferencia, MetodoPago.Tarjeta] as const).map(m => {
                                const icons = { Efectivo: '💵', Transferencia: '🏦', Tarjeta: '💳' };
                                return (
                                    <button
                                        key={m}
                                        className={`pay-btn${metodoPago === m ? ' selected' : ''}`}
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                                        onClick={() => setMetodoPago(m)}
                                    >
                                        <span className="pay-icon" style={{ fontSize: '1.2rem' }}>{icons[m]}</span>
                                        <div>{m}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '24px' }}>
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleCrearPedido}>🛵 Confirmar Pedido</button>
                </div>
            </div>
        </div>
    );
}

// ── Pedidos Screen ──────────────────────────────────────────
function EditarPedidoModal({ pedido, cliente, onClose, onGuardar }: {
    pedido: Pedido;
    cliente: Cliente | undefined;
    onClose: () => void;
    onGuardar: (idPedido: string, dataPedido: { nota_delivery?: string; metodo_pago?: MetodoPago }, idCliente?: string, nuevaDireccion?: string) => void;
}) {
    const [nota, setNota] = useState(pedido.nota_delivery || '');
    const [metodo, setMetodo] = useState<MetodoPago>(pedido.metodo_pago || MetodoPago.Efectivo);
    const [direccion, setDireccion] = useState(cliente?.direccion || '');

    const handleGuardar = () => {
        onGuardar(pedido.id, { nota_delivery: nota, metodo_pago: metodo }, cliente?.id, direccion.trim());
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '500px' }}>
                <div className="modal-title">✏️ Editar Pedido #{pedido.id}</div>
                <div className="modal-body">
                    <div className="form-group">
                        <div className="form-label">Productos (no editables)</div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem', color: 'var(--muted)' }}>
                            {pedido.items.map((i, idx) => (
                                <div key={idx}>• {i.qty}{i.isGranel ? 'kg' : ' unid'} de {i.nombre}</div>
                            ))}
                            <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--text)' }}>Total: {fmtMoney(pedido.total)}</div>
                        </div>
                    </div>
                    {cliente && (
                        <div className="form-group">
                            <div className="form-label">Direccion de entrega</div>
                            <input className="form-input" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: Calle Falsa 123, Barrio Norte" />
                            {direccion && (
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(direccion)}`} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>
                                    📍 Ver en Google Maps
                                </a>
                            )}
                        </div>
                    )}
                    <div className="form-group">
                        <div className="form-label">Nota para el repartidor</div>
                        <textarea className="form-input" rows={2} placeholder="Ej: Timbre no funciona, tocar la puerta" value={nota} onChange={e => setNota(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Forma de pago</div>
                        <div className="payment-methods" style={{ display: 'flex', gap: '8px' }}>
                            {([MetodoPago.Efectivo, MetodoPago.Transferencia, MetodoPago.Tarjeta] as const).map(m => {
                                const icons = { Efectivo: '💵', Transferencia: '🏦', Tarjeta: '💳' };
                                return (
                                    <button key={m} className={`pay-btn${metodo === m ? ' selected' : ''}`}
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                                        onClick={() => setMetodo(m)}>
                                        <span className="pay-icon" style={{ fontSize: '1.2rem' }}>{icons[m]}</span>
                                        <div>{m}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar}>💾 Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}

function PedidosScreen({ addToast }: { addToast: (m: string, t: ToastType) => void }) {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [refresh, setRefresh] = useState(0);
    const [editandoPedido, setEditandoPedido] = useState<Pedido | null>(null);

    // Fetch data
    React.useEffect(() => {
        setPedidos(getPedidos());
    }, [refresh]);

    const handleActualizarEstado = async (id: string, nuevoEstado: EstadoPedido) => {
        if (await actualizarEstadoPedido(id, nuevoEstado)) {
            addToast(`Pedido #${id.slice(0, 8)} actualizado a ${nuevoEstado}`, 'success');
            setRefresh(r => r + 1);
        } else {
            addToast(`Error al actualizar pedido #${id.slice(0, 8)}`, 'error');
        }
    };

    const handleGuardarEdicion = async (idPedido: string, dataPedido: { nota_delivery?: string; metodo_pago?: MetodoPago }, idCliente?: string, nuevaDireccion?: string) => {
        await editarPedido(idPedido, dataPedido);
        if (idCliente && nuevaDireccion !== undefined) {
            await editarCliente(idCliente, { direccion: nuevaDireccion });
        }
        addToast(`✅ Pedido #${idPedido.slice(0, 8)} actualizado`, 'success');
        setEditandoPedido(null);
        setRefresh(r => r + 1);
    };

    const ESTADO_CONFIG = {
        [EstadoPedido.Pendiente]: { color: 'var(--warning)', icon: '⏳' },
        [EstadoPedido.EnCamino]: { color: 'var(--accent)', icon: '🛵' },
        [EstadoPedido.Entregado]: { color: 'var(--success)', icon: '✅' },
        [EstadoPedido.Cancelado]: { color: 'var(--danger)', icon: '❌' },
    };

    const getMensajeCliente = (p: Pedido, cliente: Cliente): string => {
        const itemsText = p.items.map(i => `🔹 ${i.qty}${i.isGranel ? 'kg' : ' unid'} de ${i.nombre}`).join('\n');
        const metodo = p.metodo_pago || 'Efectivo';
        switch (p.estado) {
            case EstadoPedido.Pendiente:
                return `Hola ${cliente.nombre}! 😊\n\nRecibimos tu pedido *#${p.id}* en *FJ Mascotas* 🐶\n\n*Detalle:*\n${itemsText}\n\n*Total: ${fmtMoney(p.total)}*\nPago: ${metodo}\n\nLo estamos preparando, te avisamos cuando salga! ✅`;
            case EstadoPedido.EnCamino:
                return `Hola ${cliente.nombre}! 😊\n\nTu pedido *#${p.id}* de *FJ Mascotas* ya esta en camino! 🚚\n\n*Detalle:*\n${itemsText}\n\n*Total: ${fmtMoney(p.total)}*\nPago: ${metodo}\n\nPronto llegamos! 🐶`;
            case EstadoPedido.Entregado:
                return `Hola ${cliente.nombre}! 😊\n\nGracias por tu compra en *FJ Mascotas* 🐶\n\nTu pedido *#${p.id}* fue entregado. ✅ Esperamos que tus mascotas lo disfruten mucho. Hasta la proxima! ⭐`;
            default:
                return `Hola ${cliente.nombre}! 😊 Te escribimos de *FJ Mascotas* 🐶 sobre tu pedido *#${p.id}*.\n\n*Detalle:*\n${itemsText}\n\nTotal: ${fmtMoney(p.total)}\n\nEn que te podemos ayudar?`;
        }
    };

    const getMensajeRepartidor = (p: Pedido, cliente: Cliente): string => {
        const itemsText = p.items.map(i => `  - ${i.qty}${i.isGranel ? 'kg' : ' unid'} de ${i.nombre}`).join('\n');
        const metodo = p.metodo_pago || 'Efectivo';
        let msg = `📦 PEDIDO #${p.id}\n\n👤 ${cliente.nombre}\n📱 ${cliente.telefono}\n📍 ${cliente.direccion}\n\n🛍 Productos:\n${itemsText}\n\n💰 Total: ${fmtMoney(p.total)}\n💳 Cobrar en: ${metodo}`;
        if (p.nota_delivery) msg += `\n\n📝 Nota: ${p.nota_delivery}`;
        return msg;
    };

    // Calculate sumary
    const totalVendido = pedidos.filter(p => p.estado === EstadoPedido.Entregado).reduce((sum, p) => sum + p.total, 0);
    const pendingsCount = pedidos.filter(p => p.estado === EstadoPedido.Pendiente).length;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text)' }}>🛵 Gestión de Pedidos</h1>
            </div>

            <div className="weekly-summary-cards" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="summary-card">
                    <div className="sc-icon">📊</div>
                    <div className="sc-label">Total Entregados</div>
                    <div className="sc-value">{fmtMoney(totalVendido)}</div>
                </div>
                <div className="summary-card warning-card">
                    <div className="sc-icon">⏳</div>
                    <div className="sc-label">Pendientes</div>
                    <div className="sc-value" style={{ color: 'var(--warning)' }}>{pendingsCount}</div>
                </div>
            </div>

            <div className="table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Nº</th>
                            <th>Fecha</th>
                            <th>Cliente / Teléfono</th>
                            <th>Dirección</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.map((p) => {
                            const config = ESTADO_CONFIG[p.estado];
                            const cliente = db.clientes.find(c => c.id === p.id_cliente);
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 'bold' }}>#{p.id}</td>
                                    <td>
                                        <div>{new Date(p.fecha_creacion).toLocaleDateString('es-AR')}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                            {new Date(p.fecha_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{cliente?.nombre || 'Desconocido'}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{cliente?.telefono}</div>
                                    </td>
                                    <td style={{ maxWidth: '220px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }} title={cliente?.direccion}>
                                                {cliente?.direccion || '-'}
                                            </div>
                                            {cliente?.direccion && (
                                                <a
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(cliente.direccion)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Ver en Google Maps"
                                                    style={{ flexShrink: 0, fontSize: '1rem', textDecoration: 'none' }}
                                                >📍</a>
                                            )}
                                        </div>
                                        {p.nota_delivery && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: 4 }}>
                                                📝 {p.nota_delivery}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="stock-badge" style={{ backgroundColor: `${config.color}20`, color: config.color, padding: '4px 8px', borderRadius: '12px' }}>
                                            {config.icon} {p.estado}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 'bold' }}>{fmtMoney(p.total)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {p.estado === EstadoPedido.Pendiente && (
                                                <>
                                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleActualizarEstado(p.id, EstadoPedido.EnCamino)}>
                                                        🛵 En Camino
                                                    </button>
                                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleActualizarEstado(p.id, EstadoPedido.Cancelado)}>
                                                        ❌ Cancelar
                                                    </button>
                                                </>
                                            )}
                                            {p.estado === EstadoPedido.EnCamino && (
                                                <button className="checkout-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleActualizarEstado(p.id, EstadoPedido.Entregado)}>
                                                    ✅ Entregar y Cobrar
                                                </button>
                                            )}
                                            {(p.estado === EstadoPedido.Pendiente || p.estado === EstadoPedido.EnCamino) && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                                    onClick={() => setEditandoPedido(p)}
                                                >
                                                    ✏️ Editar
                                                </button>
                                            )}
                                            {cliente && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                                    title="Copiar mensaje para el repartidor"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(getMensajeRepartidor(p, cliente));
                                                        addToast('📋 Mensaje del repartidor copiado', 'success');
                                                    }}
                                                >
                                                    📋 Repartidor
                                                </button>
                                            )}
                                            {cliente?.telefono && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#25D366', borderColor: '#25D366' }}
                                                    title={`Enviar WhatsApp (estado: ${p.estado})`}
                                                    onClick={() => {
                                                        const cleanPhone = cliente.telefono.replace(/\D/g, '');
                                                        const msg = encodeURIComponent(getMensajeCliente(p, cliente));
                                                        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                                    }}
                                                >
                                                    WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {pedidos.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                                    No hay pedidos registrados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editandoPedido && (
                <EditarPedidoModal
                    pedido={editandoPedido}
                    cliente={db.clientes.find(c => c.id === editandoPedido.id_cliente)}
                    onClose={() => setEditandoPedido(null)}
                    onGuardar={handleGuardarEdicion}
                />
            )}
        </div>
    );
}

// ── Modal Editar Cliente ─────────────────────────────────────
function EditarClienteModal({ cliente, onClose, onGuardar }: {
    cliente: Cliente;
    onClose: () => void;
    onGuardar: (id: string, data: { nombre: string; telefono: string; direccion: string; notas: string }) => void;
}) {
    const [nombre, setNombre] = useState(cliente.nombre);
    const [telefono, setTelefono] = useState(cliente.telefono);
    const [direccion, setDireccion] = useState(cliente.direccion);
    const [notas, setNotas] = useState(cliente.notas || '');

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '480px' }}>
                <div className="modal-title">✏️ Editar Cliente #{cliente.id}</div>
                <div className="modal-body">
                    <div className="form-group">
                        <div className="form-label">Nombre *</div>
                        <input className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Teléfono *</div>
                        <input className="form-input" value={telefono} onChange={e => setTelefono(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <div className="form-label">Dirección</div>
                        <input className="form-input" placeholder="Ej: Calle Falsa 123, Barrio Norte" value={direccion} onChange={e => setDireccion(e.target.value)} />
                        {direccion && (
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(direccion)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}
                            >
                                📍 Ver en Google Maps
                            </a>
                        )}
                    </div>
                    <div className="form-group">
                        <div className="form-label">Notas internas</div>
                        <textarea className="form-input" rows={2} placeholder="Ej: Paga siempre en efectivo, perro Labrador..." value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={() => onGuardar(cliente.id, { nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim(), notas: notas.trim() })}>
                        💾 Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Clientes Screen (CRM) ──────────────────────────────────
function ClientesScreen({ addToast }: { addToast: (m: string, t: ToastType) => void }) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [query, setQuery] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [editando, setEditando] = useState<Cliente | null>(null);

    React.useEffect(() => {
        setClientes(getClientes());
    }, [refresh]);

    const filtered = clientes.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()) || c.telefono.includes(query));

    const totalRegistrados = clientes.length;
    const clientesFrecuentes = clientes.filter(c => c.total_compras > 0).length;

    const handleGuardar = async (id: string, data: { nombre: string; telefono: string; direccion: string; notas: string }) => {
        await editarCliente(id, data);
        addToast('✅ Cliente actualizado', 'success');
        setEditando(null);
        setRefresh(r => r + 1);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text)' }}>👥 Relación con Clientes (CRM)</h1>
            </div>

            <div className="weekly-summary-cards" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="summary-card">
                    <div className="sc-icon">📊</div>
                    <div className="sc-label">Total Registrados</div>
                    <div className="sc-value">{totalRegistrados}</div>
                </div>
                <div className="summary-card">
                    <div className="sc-icon">🌟</div>
                    <div className="sc-label">Clientes con Compras</div>
                    <div className="sc-value" style={{ color: 'var(--accent)' }}>{clientesFrecuentes}</div>
                </div>
            </div>

            <div className="table-container">
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="search-bar search-compact" style={{ width: '300px' }}>
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar por nombre o teléfono..." value={query} onChange={e => setQuery(e.target.value)} />
                        {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
                    </div>
                </div>
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Nº C.</th>
                            <th>Cliente</th>
                            <th>Contacto</th>
                            <th>Dirección</th>
                            <th>Registro</th>
                            <th>Total Compras</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((c) => (
                            <tr key={c.id}>
                                <td style={{ color: 'var(--muted)' }}>#{c.id}</td>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>{c.nombre}</div>
                                    {c.notas && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>📌 {c.notas}</div>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {c.telefono}
                                        <button className="icon-btn" title="Abrir WhatsApp" onClick={() => {
                                            const clean = c.telefono.replace(/\D/g, '');
                                            window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribimos de FJ Mascotas 🐾 ¿En qué te podemos ayudar?`)}`, '_blank');
                                        }}>
                                            💬
                                        </button>
                                    </div>
                                </td>
                                <td style={{ maxWidth: '220px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.direccion}>
                                            {c.direccion || <span style={{ color: 'var(--muted)' }}>-</span>}
                                        </span>
                                        {c.direccion && (
                                            <a
                                                href={`https://maps.google.com/?q=${encodeURIComponent(c.direccion)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Ver en Google Maps"
                                                style={{ flexShrink: 0, textDecoration: 'none' }}
                                            >📍</a>
                                        )}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    {new Date(c.fecha_registro).toLocaleDateString('es-AR')}
                                </td>
                                <td>
                                    {c.total_compras > 0 ? (
                                        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{fmtMoney(c.total_compras)}</span>
                                    ) : (
                                        <span style={{ color: 'var(--muted)' }}>Sin compras</span>
                                    )}
                                </td>
                                <td>
                                    <button
                                        className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                        onClick={() => setEditando(c)}
                                    >
                                        ✏️ Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                                    No se encontraron clientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editando && (
                <EditarClienteModal
                    cliente={editando}
                    onClose={() => setEditando(null)}
                    onGuardar={handleGuardar}
                />
            )}
        </div>
    );
}
