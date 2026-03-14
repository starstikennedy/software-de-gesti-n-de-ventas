// ============================================================
// POS — TIPOS & LÓGICA CENTRAL
// ============================================================

// ── 1. ENUMS ─────────────────────────────────────────────────
export enum MetodoPago {
    Efectivo = 'Efectivo',
    Transferencia = 'Transferencia',
    Tarjeta = 'Tarjeta',
}

export enum TipoMovimiento {
    Entrada = 'Entrada',
    Salida = 'Salida',
}

// ── 2. INTERFACES / TIPOS ────────────────────────────────────
export interface Producto {
    id: number;
    nombre: string;
    sku: string;
    precio_venta: number;
    precio_costo: number;
    stock_actual: number;
    stock_minimo: number;
    categoria: string;
    especie: string;
    emoji: string;
    imagen?: string;   // URL de foto (reservado para futuro)
    peso_kg?: number;  // Peso en kg (para ordenar y para venta por kilo)
    venta_a_granel?: boolean; // Si es true, se puede vender por fracción de kg/monto
    id_producto_suelto?: number; // ID del producto a granel que abastece este saco
    kilos_por_saco?: number; // Cuántos kg transfiere al producto suelto cuando se abre
}

export interface Venta {
    id_venta: number;
    fecha_hora: string; // ISO string
    total_venta: number;
    total_costo?: number;
    utilidad?: number;
    metodo_pago: MetodoPago;
}

export interface DetalleVenta {
    id_detalle: number;
    id_venta: number;
    id_producto: number;
    cantidad: number;
    subtotal: number;
}

export interface MovimientoStock {
    id_movimiento: number;
    id_producto: number;
    tipo: TipoMovimiento;
    cantidad: number;
    fecha: string; // ISO string
    nota: string;
}

export interface ItemCarrito {
    id: number;
    nombre: string;
    precio: number;
    qty: number;
    emoji: string;
    isGranel?: boolean;
}

// ── 3. FACTURAS, PEDIDOS Y CLIENTES ──────────────────────────
export enum EstadoFactura {
    PorPagar = 'Por Pagar',
    Pagada = 'Pagada',
    Vencida = 'Vencida',
    Anulada = 'Anulada'
}

export type TipoFactura = 'Compra' | 'Venta';

export interface Factura {
    id: number;
    numero: string;
    tipo: TipoFactura;
    proveedor_cliente: string;
    descripcion: string;
    monto_total: number;
    fecha_emision: string; // YYYY-MM-DD
    fecha_vencimiento: string; // YYYY-MM-DD
    estado: EstadoFactura;
    responsable_subida?: string;
    responsable_pago?: string;
    metodo_pago_final?: string;
    fecha_pago?: string;
    notas?: string;
    imagen_url?: string;
}

export interface Cliente {
    id: number;
    nombre: string;
    telefono: string;
    direccion: string;
    notas?: string;
    total_compras: number;
    fecha_registro: string;
}

export enum EstadoPedido {
    Pendiente = 'Pendiente',
    EnCamino = 'En Camino',
    Entregado = 'Entregado',
    Cancelado = 'Cancelado'
}

export interface Pedido {
    id: number;
    id_cliente: number;
    id_venta?: number; // Vinculado si se entregó y "cobró" formalmente en el pos
    items: ItemCarrito[];
    total: number;
    estado: EstadoPedido;
    metodo_pago?: MetodoPago; // Efectivo, Transferencia, Tarjeta
    fecha_creacion: string;
    fecha_entrega?: string;
    nota_delivery?: string;
}

export interface DB {
    productos: Producto[];
    ventas: Venta[];
    detalle_venta: DetalleVenta[];
    movimientos_stock: MovimientoStock[];
    facturas: Factura[];
    clientes: Cliente[];
    pedidos: Pedido[];
}

export const db: DB = {
    productos: [],
    ventas: [],
    detalle_venta: [],
    movimientos_stock: [],
    facturas: [],
    clientes: [],
    pedidos: [],
};

// ── 4. SEED DATA ─────────────────────────────────────────────
export function seedData(): void {
    db.productos = [
        // Alimento Perro
        { id: 1, nombre: 'Royal Canin Adulto 15kg', sku: 'RC-AD-15', precio_venta: 42000, precio_costo: 30000, stock_actual: 12, stock_minimo: 3, categoria: 'Alimento', especie: 'Perro', emoji: '🐶', peso_kg: 15 },
        { id: 2, nombre: 'Purina Dog Chow 3kg', sku: 'PDC-3', precio_venta: 12500, precio_costo: 8500, stock_actual: 20, stock_minimo: 5, categoria: 'Alimento', especie: 'Perro', emoji: '🐶', peso_kg: 3 },
        { id: 3, nombre: 'Hills Science Diet 7kg', sku: 'HSD-7', precio_venta: 32000, precio_costo: 22000, stock_actual: 8, stock_minimo: 2, categoria: 'Alimento', especie: 'Perro', emoji: '🐶', peso_kg: 7 },
        // Alimento Gato
        { id: 4, nombre: 'Royal Canin Kitten 2kg', sku: 'RC-KIT-2', precio_venta: 18000, precio_costo: 12000, stock_actual: 10, stock_minimo: 3, categoria: 'Alimento', especie: 'Gato', emoji: '🐱', peso_kg: 2 },
        { id: 5, nombre: 'Whiskas Adulto 3kg', sku: 'WH-AD-3', precio_venta: 9500, precio_costo: 6500, stock_actual: 15, stock_minimo: 4, categoria: 'Alimento', especie: 'Gato', emoji: '🐱', peso_kg: 3 },
        { id: 6, nombre: 'Felix Pouch x 12 unid', sku: 'FX-P12', precio_venta: 7200, precio_costo: 4800, stock_actual: 3, stock_minimo: 5, categoria: 'Alimento', especie: 'Gato', emoji: '🐱' },
        // Snacks
        { id: 7, nombre: 'Pedigree Dentastix', sku: 'PG-DENT', precio_venta: 4500, precio_costo: 2800, stock_actual: 25, stock_minimo: 5, categoria: 'Snacks', especie: 'Perro', emoji: '🦴' },
        { id: 8, nombre: 'Premio Adulto x 100g', sku: 'PM-100', precio_venta: 2200, precio_costo: 1400, stock_actual: 30, stock_minimo: 8, categoria: 'Snacks', especie: 'Perro', emoji: '🦴', peso_kg: 0.1 },
        { id: 9, nombre: 'Temptations Gato 85g', sku: 'TMP-85', precio_venta: 3200, precio_costo: 1900, stock_actual: 18, stock_minimo: 5, categoria: 'Snacks', especie: 'Gato', emoji: '😺', peso_kg: 0.085 },
        // Accesorios
        { id: 10, nombre: 'Collar Ajustable M', sku: 'COL-M', precio_venta: 3800, precio_costo: 2000, stock_actual: 7, stock_minimo: 2, categoria: 'Accesorios', especie: 'Perro', emoji: '🏷️' },
        { id: 11, nombre: 'Correa Extensible 5m', sku: 'COR-5M', precio_venta: 8500, precio_costo: 5000, stock_actual: 5, stock_minimo: 2, categoria: 'Accesorios', especie: 'Perro', emoji: '🐕' },
        // Higiene
        { id: 12, nombre: 'Arena Sanitaria 5L', sku: 'AR-5L', precio_venta: 5500, precio_costo: 3200, stock_actual: 0, stock_minimo: 4, categoria: 'Higiene', especie: 'Gato', emoji: '🧹', peso_kg: 5 },
        { id: 13, nombre: 'Shampoo Medicado 250ml', sku: 'SH-MED', precio_venta: 6200, precio_costo: 3800, stock_actual: 9, stock_minimo: 3, categoria: 'Higiene', especie: 'Perro', emoji: '🛁' },
        
        // Alimento Suelto (Ejemplo Mauri)
        { id: 14, nombre: 'Master Dog Adulto Carne (Suelto)', sku: 'MD-AD-SU', precio_venta: 3000, precio_costo: 2000, stock_actual: 20, stock_minimo: 5, categoria: 'Alimento', especie: 'Perro', emoji: '⚖️', venta_a_granel: true },
        // Saco Cerrado (vinculado al suelto)
        { id: 15, nombre: 'Master Dog Adulto Carne 15kg (Saco)', sku: 'MD-AD-15', precio_venta: 31000, precio_costo: 22000, stock_actual: 4, stock_minimo: 1, categoria: 'Alimento', especie: 'Perro', emoji: '🛍️', id_producto_suelto: 14, kilos_por_saco: 15 },
    ];
}

// Helper: obtener todas las especies únicas del catálogo
export const getEspecies = (): string[] =>
    ['Todos', ...Array.from(new Set(db.productos.map((p) => p.especie))).sort()];

// Helper: obtener todas las categorías únicas del catálogo
export const getCategorias = (): string[] =>
    ['Todos', ...Array.from(new Set(db.productos.map((p) => p.categoria))).sort()];

// ── 5. HELPERS INTERNOS ──────────────────────────────────────
function nextId(arr: { id?: number; id_venta?: number; id_detalle?: number; id_movimiento?: number }[]): number {
    if (!arr.length) return 1;
    return Math.max(...arr.map((x: any) => x.id ?? x.id_venta ?? x.id_detalle ?? x.id_movimiento ?? 0)) + 1;
}

export function getProducto(id: number): Producto | undefined {
    return db.productos.find((p) => p.id === id);
}

// ── 6. CHECKOUT — CRITICAL PATH ──────────────────────────────
export interface CheckoutResult {
    ok: boolean;
    ventaId?: number;
    total?: number;
    error?: string;
}

export function checkout(carrito: ItemCarrito[], metodo: MetodoPago): CheckoutResult {
    if (!carrito.length) return { ok: false, error: 'El carrito está vacío' };

    let totalVenta = 0;
    let totalCosto = 0;

    // Validar stock
    for (const item of carrito) {
        const prod = getProducto(item.id);
        if (!prod) return { ok: false, error: `Producto #${item.id} no encontrado` };
        if (prod.stock_actual < item.qty)
            return { ok: false, error: `Stock insuficiente para "${prod.nombre}"` };
        
        totalVenta += item.qty * item.precio;
        totalCosto += item.qty * prod.precio_costo;
    }

    const utilidad = totalVenta - totalCosto;
    const now = new Date().toISOString();
    const ventaId = nextId(db.ventas);

    // Registrar venta
    db.ventas.push({ id_venta: ventaId, fecha_hora: now, total_venta: totalVenta, total_costo: totalCosto, utilidad: utilidad, metodo_pago: metodo });

    // Detalle + ajuste de stock
    carrito.forEach((item) => {
        db.detalle_venta.push({
            id_detalle: nextId(db.detalle_venta),
            id_venta: ventaId,
            id_producto: item.id,
            cantidad: item.qty,
            subtotal: item.qty * item.precio,
        });
        const prod = getProducto(item.id)!;
        prod.stock_actual -= item.qty;
        db.movimientos_stock.push({
            id_movimiento: nextId(db.movimientos_stock),
            id_producto: item.id,
            tipo: TipoMovimiento.Salida,
            cantidad: item.qty,
            fecha: now,
            nota: `Venta #${ventaId}`,
        });
    });

    return { ok: true, ventaId, total: totalVenta };
}

// ── 7. CARGAR STOCK ──────────────────────────────────────────
export function cargarStock(productoId: number, cantidad: number, nota = 'Carga manual'): boolean {
    const prod = getProducto(productoId);
    if (!prod || cantidad <= 0) return false;
    prod.stock_actual += cantidad;
    db.movimientos_stock.push({
        id_movimiento: nextId(db.movimientos_stock),
        id_producto: productoId,
        tipo: TipoMovimiento.Entrada,
        cantidad,
        fecha: new Date().toISOString(),
        nota,
    });
    return true;
}

// ── 8. AGREGAR PRODUCTO ──────────────────────────────────────
export function agregarProducto(data: Omit<Producto, 'id'>): Producto {
    const newId = nextId(db.productos);
    const prod: Producto = { id: newId, ...data };
    db.productos.push(prod);
    return prod;
}

export function editarProducto(id: number, data: Partial<Omit<Producto, 'id'>>): boolean {
    const prod = getProducto(id);
    if (!prod) return false;
    Object.assign(prod, data);
    return true;
}

export function abrirSaco(idSaco: number): { ok: boolean; error?: string } {
            });
    });

    const topProductoArray = Object.values(conteo).sort((a, b) => b.totalBruto - a.totalBruto);
    const topProducto = topProductoArray.length > 0 ? topProductoArray[0] : undefined;

    return { totalVentas, totalCosto, totalUtilidad, cantidadVentas, margenPromedio, ticketPromedio, topProducto };
}

// ── 14. FACTURAS ─────────────────────────────────────────────

export function agregarFactura(data: Omit<Factura, 'id'>): Factura {
    const id = db.facturas.length ? Math.max(...db.facturas.map((f) => f.id)) + 1 : 1;
    const factura: Factura = { id, ...data };
    db.facturas.push(factura);
    return factura;
}

export function actualizarEstadoFactura(id: number, estado: EstadoFactura): boolean {
    const f = db.facturas.find((f) => f.id === id);
    if (!f) return false;
    f.estado = estado;
    return true;
}

export function editarFactura(id: number, data: Partial<Omit<Factura, 'id'>>): boolean {
    const f = db.facturas.find((f) => f.id === id);
    if (!f) return false;
    Object.assign(f, data);
    return true;
}

export function pagarFactura(id: number, metodo: string, responsable: string, fecha: string): boolean {
    const f = db.facturas.find((f) => f.id === id);
    if (!f) return false;
    f.estado = EstadoFactura.Pagada;
    f.metodo_pago_final = metodo;
    f.responsable_pago = responsable;
    f.fecha_pago = fecha;
    return true;
}

export function cancelarPago(id: number): boolean {
    const f = db.facturas.find((f) => f.id === id);
    if (!f) return false;
    f.estado = EstadoFactura.PorPagar;
    f.metodo_pago_final = undefined;
    f.responsable_pago = undefined;
    f.fecha_pago = undefined;
    return true;
}

export function getFacturas(): Factura[] {
    // Auto-detectar vencidas al leer
    db.facturas.forEach((f) => {
        if (
            f.estado === EstadoFactura.PorPagar &&
            new Date(f.fecha_vencimiento + 'T12:00:00') < new Date()
        ) {
            f.estado = EstadoFactura.Vencida;
        }
    });
    return db.facturas;
}

// ── 15. CLIENTES (CRM) ────────────────────────────────────────

export function crearCliente(data: Omit<Cliente, 'id' | 'total_compras' | 'fecha_registro'>): Cliente {
    const id = nextId(db.clientes as any);
    const cliente: Cliente = {
        id,
        ...data,
        total_compras: 0,
        fecha_registro: new Date().toISOString(),
    };
    db.clientes.push(cliente);
    return cliente;
}

export function editarCliente(id: number, data: Partial<Omit<Cliente, 'id' | 'total_compras' | 'fecha_registro'>>): boolean {
    const c = db.clientes.find((x) => x.id === id);
    if (!c) return false;
    Object.assign(c, data);
    return true;
}

export function getClientes(): Cliente[] {
    return db.clientes.sort((a, b) => b.total_compras - a.total_compras);
}

export function getClienteByPhone(phone: string): Cliente | undefined {
    return db.clientes.find(c => c.telefono === phone);
}

// ── 16. PEDIDOS (DELIVERY) ────────────────────────────────────

export function crearPedido(data: Omit<Pedido, 'id' | 'fecha_creacion'>): Pedido {
    const id = nextId(db.pedidos as any);
    
    // Descontar stock inmediatamente al crear pedido (para que no se venda en local)
    data.items.forEach((item) => {
        const prod = getProducto(item.id);
        if (prod) {
            prod.stock_actual -= item.qty;
            db.movimientos_stock.push({
                id_movimiento: nextId(db.movimientos_stock),
                id_producto: item.id,
                tipo: TipoMovimiento.Salida,
                cantidad: item.qty,
                fecha: new Date().toISOString(),
                nota: `Reserva para Pedido #${id}`,
            });
        }
    });

    const pedido: Pedido = {
        id,
        ...data,
        fecha_creacion: new Date().toISOString(),
    };
    db.pedidos.push(pedido);
    return pedido;
}

export function actualizarEstadoPedido(id: number, estado: EstadoPedido): boolean {
    const p = db.pedidos.find((x) => x.id === id);
    if (!p) return false;

    // Si se cancela, devolvemos el stock
    if (estado === EstadoPedido.Cancelado && p.estado !== EstadoPedido.Cancelado && p.estado !== EstadoPedido.Entregado) {
        p.items.forEach((item) => {
            const prod = getProducto(item.id);
            if (prod) {
                prod.stock_actual += item.qty;
                db.movimientos_stock.push({
                    id_movimiento: nextId(db.movimientos_stock),
                    id_producto: item.id,
                    tipo: TipoMovimiento.Entrada,
                    cantidad: item.qty,
                    fecha: new Date().toISOString(),
                    nota: `Devolución por Pedido #${p.id} cancelado`,
                });
            }
        });
    }

    // Si se entrega formalmente, lo cobramos como venta del día para que impacte en informes
    // Solo si no estaba ya Entregado
    if (estado === EstadoPedido.Entregado && p.estado !== EstadoPedido.Entregado) {
        p.fecha_entrega = new Date().toISOString();
        const res = checkout(p.items, p.metodo_pago || MetodoPago.Efectivo); // Pasamos por la caja fuerte
        if (res.ok) {
            p.id_venta = res.ventaId;
            // Aumentamos compras del cliente
            const c = db.clientes.find(x => x.id === p.id_cliente);
            if (c) c.total_compras += p.total;
        }
    }

    p.estado = estado;
    return true;
}

// (Exporting interfaces to make tests happy. The interfaces are already exported defined at the top of the file.)

export function getPedidos(): Pedido[] {
    return db.pedidos.slice().reverse(); // Show most recent first
}
