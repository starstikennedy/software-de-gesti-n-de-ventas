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
}

// ── 3. DB EN MEMORIA ─────────────────────────────────────────

export enum EstadoFactura {
    PorPagar = 'Por Pagar',
    Pagada = 'Pagada',
    Vencida = 'Vencida',
    Anulada = 'Anulada',
}

export type TipoFactura = 'Compra' | 'Venta';

export interface Factura {
    id: number;
    numero: string;         // Ej: FAC-001
    tipo: TipoFactura;
    proveedor_cliente: string;
    descripcion: string;
    monto_total: number;
    fecha_emision: string;  // ISO date string
    fecha_vencimiento: string; // ISO date string
    estado: EstadoFactura;
    notas?: string;
    imagen_url?: string;    // base64 data URL de la foto de la factura
    responsable_subida?: string;  // quién subió la factura al sistema
    responsable_pago?: string;    // quién es responsable de pagar
    metodo_pago_final?: string;   // Efectivo / Transferencia / Depósito / Tarjeta
    fecha_pago?: string;          // ISO date string de cuándo se pagó
}

export interface DB {
    productos: Producto[];
    ventas: Venta[];
    detalle_venta: DetalleVenta[];
    movimientos_stock: MovimientoStock[];
    facturas: Factura[];
}

export const db: DB = {
    productos: [],
    ventas: [],
    detalle_venta: [],
    movimientos_stock: [],
    facturas: [],
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

// ── 9. REPORTE DIARIO ────────────────────────────────────────
export interface ReporteDiario {
    fecha: string;
    totalVentas: number;
    totalCosto: number;
    totalUtilidad: number;
    cantidadVentas: number;
    porMetodo: Record<MetodoPago, { total: number; cantidad: number }>;
    ventas: (Venta & { items: (DetalleVenta & { producto: Producto | undefined })[] })[];
}

export function getReporteDiario(fecha = new Date()): ReporteDiario {
    const dayStr = fecha.toDateString();
    const ventasHoy = db.ventas.filter((v) => new Date(v.fecha_hora).toDateString() === dayStr);
    const totalVentas = ventasHoy.reduce((s, v) => s + v.total_venta, 0);
    const totalCosto = ventasHoy.reduce((s, v) => s + (v.total_costo || 0), 0);
    const totalUtilidad = ventasHoy.reduce((s, v) => s + (v.utilidad || 0), 0);

    const porMetodo: ReporteDiario['porMetodo'] = {
        [MetodoPago.Efectivo]: { total: 0, cantidad: 0 },
        [MetodoPago.Transferencia]: { total: 0, cantidad: 0 },
        [MetodoPago.Tarjeta]: { total: 0, cantidad: 0 },
    };
    ventasHoy.forEach((v) => {
        porMetodo[v.metodo_pago].total += v.total_venta;
        porMetodo[v.metodo_pago].cantidad++;
    });

    const ventas = ventasHoy.map((v) => ({
        ...v,
        items: db.detalle_venta
            .filter((d) => d.id_venta === v.id_venta)
            .map((d) => ({ ...d, producto: getProducto(d.id_producto) })),
    }));

    return { fecha: dayStr, totalVentas, totalCosto, totalUtilidad, cantidadVentas: ventasHoy.length, porMetodo, ventas };
}

// ── 10. UTILIDADES ───────────────────────────────────────────
export const getProductosBajoStock = (): Producto[] =>
    db.productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo);

export const getProductosSinStock = (): Producto[] =>
    db.productos.filter((p) => p.stock_actual === 0);

export const getHistorialProducto = (id: number): MovimientoStock[] =>
    db.movimientos_stock.filter((m) => m.id_producto === id);

// ── 11. UTILIDAD DE FORMATO ──────────────────────────────────
export function fmtMoney(n: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(n);
}

// ── 12. REPORTE SEMANAL ──────────────────────────────────────
export interface DiaReporte {
    fecha: Date;
    label: string;       // Ej: "Lun 10"
    totalVentas: number;
    totalCosto: number;
    totalUtilidad: number;
    cantidadVentas: number;
    porMetodo: Record<MetodoPago, { total: number; cantidad: number }>;
    topProductos: { nombre: string; emoji: string; cantidad: number }[];
}

export interface ReporteSemanal {
    dias: DiaReporte[];
    totalSemana: number;
    totalCostoSemana: number;
    totalUtilidadSemana: number;
    cantidadSemana: number;
    maxDiario: number; // para escalar el gráfico de barras
}

export function getReporteSemanal(fechaBase = new Date()): ReporteSemanal {
    const dias: DiaReporte[] = [];
    const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Generar los 7 días (hoy + 6 anteriores, en orden cronológico)
    for (let i = 6; i >= 0; i--) {
        const d = new Date(fechaBase);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const dayStr = d.toDateString();
        const ventasDia = db.ventas.filter((v) => new Date(v.fecha_hora).toDateString() === dayStr);
        const totalVentas = ventasDia.reduce((s, v) => s + v.total_venta, 0);
        const totalCosto = ventasDia.reduce((s, v) => s + (v.total_costo || 0), 0);
        const totalUtilidad = ventasDia.reduce((s, v) => s + (v.utilidad || 0), 0);

        const porMetodo: DiaReporte['porMetodo'] = {
            [MetodoPago.Efectivo]: { total: 0, cantidad: 0 },
            [MetodoPago.Transferencia]: { total: 0, cantidad: 0 },
            [MetodoPago.Tarjeta]: { total: 0, cantidad: 0 },
        };
        ventasDia.forEach((v) => {
            porMetodo[v.metodo_pago].total += v.total_venta;
            porMetodo[v.metodo_pago].cantidad++;
        });

        // Top productos del día
        const conteo: Record<number, { nombre: string; emoji: string; cantidad: number }> = {};
        ventasDia.forEach((v) => {
            db.detalle_venta
                .filter((d) => d.id_venta === v.id_venta)
                .forEach((d) => {
                    const prod = getProducto(d.id_producto);
                    if (!prod) return;
                    if (!conteo[d.id_producto]) conteo[d.id_producto] = { nombre: prod.nombre, emoji: prod.emoji, cantidad: 0 };
                    conteo[d.id_producto].cantidad += d.cantidad;
                });
        });
        const topProductos = Object.values(conteo)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 3);

        const dayLabel = `${DIAS_ES[d.getDay()]} ${d.getDate()}`;
        dias.push({ fecha: d, label: dayLabel, totalVentas, totalCosto, totalUtilidad, cantidadVentas: ventasDia.length, porMetodo, topProductos });
    }

    const totalSemana = dias.reduce((s, d) => s + d.totalVentas, 0);
    const totalCostoSemana = dias.reduce((s, d) => s + d.totalCosto, 0);
    const totalUtilidadSemana = dias.reduce((s, d) => s + d.totalUtilidad, 0);
    const cantidadSemana = dias.reduce((s, d) => s + d.cantidadVentas, 0);
    const maxDiario = Math.max(...dias.map((d) => d.totalVentas), 1);

    return { dias, totalSemana, totalCostoSemana, totalUtilidadSemana, cantidadSemana, maxDiario };
}

// ── 13. FACTURAS ─────────────────────────────────────────────

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
