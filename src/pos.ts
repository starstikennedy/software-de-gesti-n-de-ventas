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
    id: string; // UUID de Supabase
    nombre: string;
    sku: string;
    precio_venta: number;
    precio_costo: number;
    stock_actual: number;
    stock_minimo: number;
    categoria: string;
    especie: string;
    emoji: string;
    imagen?: string;
    peso_kg?: number;
    venta_a_granel?: boolean;
    id_producto_suelto?: string; // UUID vinculado
    kilos_por_saco?: number;
}

export interface Venta {
    id_venta: string; // UUID
    fecha_hora: string;
    total_venta: number;
    total_costo?: number;
    utilidad?: number;
    metodo_pago: MetodoPago;
    banco?: string;
    vendedor?: string;
    items?: any[]; // Snapshot del carrito en formato JSON
}

export interface DetalleVenta {
    id_detalle: string;
    id_venta: string;
    id_producto: string;
    cantidad: number;
    subtotal: number;
}

export interface MovimientoStock {
    id_movimiento: string; // UUID
    id_producto: string; // UUID
    tipo: TipoMovimiento;
    cantidad: number;
    fecha: string; // ISO string
    nota: string;
}

export interface ItemCarrito {
    id: string; // UUID de Supabase
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
    Anulada = 'Anulada',
}

export type TipoFactura = 'Compra';

export interface ItemFactura {
    id: string;            // UUID
    concepto: string;      // nombre del producto / servicio
    cantidad: number;
    precio_unitario: number;
    descuento?: number;    // descuento en pesos
}

export interface LogFactura {
    accion: string;
    fecha: string;
    detalle?: string;
    usuario?: string;
}

export interface Factura {
    id: string; // UUID
    numero: string;
    tipo: TipoFactura;
    proveedor_cliente: string;
    descripcion: string;
    monto_total: number;
    fecha_emision: string;
    fecha_vencimiento: string;
    estado: EstadoFactura;
    notas?: string;
    imagen_url?: string;
    registrado_por?: string;
    pagado_por?: string;
    metodo_pago?: string;
    banco?: string;
    fecha_pago?: string;
    items?: ItemFactura[];
    historial?: LogFactura[];
    descuento_global?: number;
    valor_neto?: number;
}

export interface Cliente {
    id: string; // UUID
    nombre: string;
    telefono: string;
    direccion: string;
    email?: string;
    notas?: string;
    total_compras: number;
    fecha_registro: string;
    deuda?: number;
    frecuente?: boolean;
}

export enum EstadoPedido {
    Pendiente = 'Pendiente',
    EnCamino = 'En Camino',
    Entregado = 'Entregado',
    Cancelado = 'Cancelado'
}

export interface Pedido {
    id: string; // UUID
    id_cliente: string; // UUID
    id_venta?: string; // UUID vinculado si se entregó y "cobró" formalmente en el pos
    items: ItemCarrito[];
    total: number;
    estado: EstadoPedido;
    metodo_pago?: MetodoPago; // Efectivo, Transferencia, Tarjeta
    fecha_creacion: string;
    fecha_entrega?: string;
    nota_delivery?: string;
}

export interface Auditoria {
    id: string; // UUID
    fecha: string; // ISO
    usuario: string; // Email o nombre
    accion: string; // Ej: "Venta realizada", "Producto editado"
    modulo: string; // Ej: "Ventas", "Inventario", "Facturas"
    detalle: string; // Más info JSON o texto
}

import { supabase } from './supabaseClient';

// ── 3. FACTURAS, PEDIDOS Y CLIENTES ──────────────────────────
// ... (mismos enums e interfaces)

export interface DB {
    productos: Producto[];
    ventas: Venta[];
    detalle_venta: DetalleVenta[];
    movimientos_stock: MovimientoStock[];
    facturas: Factura[];
    clientes: Cliente[];
    pedidos: Pedido[];
    auditoria: Auditoria[];
}

// Mantenemos una instancia reactiva local para el estado de la UI
export const db: DB = {
    productos: [],
    ventas: [],
    detalle_venta: [],
    movimientos_stock: [],
    facturas: [],
    clientes: [],
    pedidos: [],
    auditoria: [],
};

// ── 4. SEED DATA & INITIALIZATION ────────────────────────────

/** Hace un ping liviano a Supabase para "despertar" el servidor antes del login */
export async function wakeUpSupabase(): Promise<void> {
    try {
        await supabase.from('productos').select('id').limit(1);
    } catch (_) {
        // silencioso — solo queremos despertar la conexión
    }
}

/** Descarga todos los datos de Supabase y puebla el objeto `db` local */
export async function syncFromCloud(): Promise<void> {
    try {
        // Limitar ventas a los últimos 90 días para no traer todo el historial
        const fechaCorte = new Date();
        fechaCorte.setDate(fechaCorte.getDate() - 90);
        const fechaCorteISO = fechaCorte.toISOString();

        const [
            { data: prods },
            { data: vnts },
            { data: facts },
            { data: clnts },
            { data: peds },
            { data: logs }
        ] = await Promise.all([
            supabase.from('productos').select('*').order('nombre'),
            supabase.from('ventas').select('*').gte('fecha_hora', fechaCorteISO).order('fecha_hora', { ascending: false }),
            supabase.from('facturas').select('*').order('fecha_emision', { ascending: false }),
            supabase.from('clientes').select('*').order('nombre'),
            supabase.from('pedidos').select('*').order('fecha_creacion', { ascending: false }),
            supabase.from('auditoria').select('*').limit(200).order('fecha', { ascending: false })
        ]);

        if (prods) db.productos = (prods as any[]).map(p => ({
            ...p,
            precio_venta: p.precio,
            precio_costo: p.costo,
            stock_actual: p.stock,
            stock_minimo: 5, // default
            especie: p.mascota || 'Varios',
            emoji: '📦'
        }));
        if (vnts) db.ventas = vnts as any[];
        if (facts) db.facturas = (facts as any[]).map(f => ({
            ...f,
            proveedor_cliente: f.proveedor,
            monto_total: f.monto_total,
            items: f.items || []
        }));
        if (clnts) db.clientes = clnts as any[];
        if (peds) db.pedidos = peds as any[];
        if (logs) db.auditoria = logs;
    } catch (e) {
        console.error('Error syncing from cloud:', e);
    }
}

/** Registra un evento en la tabla de auditoría */
export async function registrarAuditoria(usuario: string, accion: string, modulo: string, detalle: string): Promise<void> {
    try {
        const { data, error } = await supabase
            .from('auditoria')
            .insert([{
                fecha: new Date().toISOString(),
                usuario,
                accion,
                modulo,
                detalle
            }])
            .select()
            .single();

        if (error) {
            console.warn('No se pudo registrar en la tabla auditoria:', error.message);
            return;
        }

        if (data) {
            db.auditoria.unshift(data as any);
            if (db.auditoria.length > 200) db.auditoria.pop();
        }
    } catch (e) {
        console.error('Error en registrarAuditoria:', e);
    }
}

// Helper: obtener todas las especies únicas del catálogo
export const getEspecies = (): string[] =>
    ['Todos', ...Array.from(new Set(db.productos.map((p) => p.especie))).sort()];

// Helper: obtener todas las categorías únicas del catálogo
export const getCategorias = (): string[] =>
    ['Todos', ...Array.from(new Set(db.productos.map((p) => p.categoria))).sort()];

// ── 5. HELPERS INTERNOS ──────────────────────────────────────
export function getProducto(id: string): Producto | undefined {
    return db.productos.find((p) => p.id === id);
}

// ── 6. CHECKOUT — CRITICAL PATH ──────────────────────────────
export interface CheckoutResult {
    ok: boolean;
    ventaId?: string;
    total?: number;
    error?: string;
}

export async function checkout(carrito: ItemCarrito[], metodo: MetodoPago, banco?: string, vendedor?: string): Promise<CheckoutResult> {
    if (!carrito.length) return { ok: false, error: 'El carrito está vacío' };

    let totalVenta = 0;
    let totalCosto = 0;

    // Validar stock localmente primero (optimista)
    for (const item of carrito) {
        const prod = getProducto(item.id);
        if (!prod) return { ok: false, error: `Producto #${item.id} no encontrado` };
        if (prod.stock_actual < item.qty)
            return { ok: false, error: `Stock insuficiente para "${prod.nombre}"` };
        
        totalVenta += item.qty * item.precio;
        totalCosto += item.qty * prod.precio_costo;
    }

    const utilidad = totalVenta - totalCosto;

    try {
        // 1. Registrar venta en Supabase
        const { data: ventaData, error: ventaError } = await supabase
            .from('ventas')
            .insert([{
                total: totalVenta,
                metodo_pago: metodo,
                banco: banco,
                items: carrito,
                vendedor: vendedor || 'Sistema'
            }])
            .select()
            .single();

        if (ventaError) throw ventaError;

        const ventaId = ventaData.id;

        // 2. Detalle + ajuste de stock (en el futuro esto debería ser una transacción/ RPC)
        for (const item of carrito) {
            // Actualizar stock en Supabase
            const prod = getProducto(item.id)!;
            const nuevoStock = prod.stock_actual - item.qty;
            
            await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', item.id);

            // Nota: Aquí podríamos insertar en una tabla de movimientos si la creamos
        }

        // 3. Sincronizar cache local
        await syncFromCloud();

        // 4. Auditoría
        await registrarAuditoria(vendedor || 'Sistema', `Venta realizada: ${fmtMoney(totalVenta)}`, 'Ventas', `Método: ${metodo}${banco ? ` (${banco})` : ''}. Items: ${carrito.length}`);

        return { ok: true, ventaId, total: totalVenta };
    } catch (err: any) {
        console.error('Checkout error:', err);
        return { ok: false, error: err.message };
    }
}

// ── 7. CARGAR STOCK ──────────────────────────────────────────
export async function cargarStock(productoId: string, cantidad: number, usuario = 'Sistema', nota = 'Carga manual'): Promise<boolean> {
    const prod = getProducto(productoId);
    if (!prod || cantidad <= 0) return false;

    try {
        const nuevoStock = prod.stock_actual + cantidad;
        const { error } = await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', productoId);

        if (error) throw error;
        await syncFromCloud();

        await registrarAuditoria(usuario, `Stock cargado: +${cantidad} en ${prod.nombre}`, 'Inventario', `Motivo: ${nota}`);
        
        return true;
    } catch (e) {
        console.error('Error al cargar stock:', e);
        return false;
    }
}

// ── 8. AGREGAR/EDITAR PRODUCTOS ──────────────────────────────
export async function agregarProducto(data: Omit<Producto, 'id'>, usuario = 'Sistema'): Promise<Producto | null> {
    try {
        const { data: newProd, error } = await supabase
            .from('productos')
            .insert([{
                sku: data.sku,
                nombre: data.nombre,
                precio: data.precio_venta,
                costo: data.precio_costo,
                stock: data.stock_actual,
                categoria: data.categoria,
                mascota: data.especie,
                peso: data.peso_kg
            }])
            .select()
            .single();

        if (error) throw error;
        await syncFromCloud();

        await registrarAuditoria(usuario, `Producto creado: ${data.nombre}`, 'Inventario', `SKU: ${data.sku}, Stock: ${data.stock_actual}`);

        return newProd as any;
    } catch (e) {
        console.error('Error al agregar producto:', e);
        return null;
    }
}

export async function editarProducto(id: string, data: Partial<Omit<Producto, 'id'>>, usuario = 'Sistema'): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('productos')
            .update({
                sku: data.sku,
                nombre: data.nombre,
                precio: data.precio_venta,
                costo: data.precio_costo,
                stock: data.stock_actual,
                categoria: data.categoria,
                mascota: data.especie
            })
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();

        const prod = getProducto(id);
        await registrarAuditoria(usuario, `Producto editado: ${prod?.nombre || id}`, 'Inventario', `Cambios: ${Object.keys(data).join(', ')}`);

        return true;
    } catch (e) {
        console.error('Error al editar producto:', e);
        return false;
    }
}

// ── 9. REPORTE DIARIO ────────────────────────────────────────
export interface DesgloseCategoria {
    total: number;
    cantidad: number;
}

export interface ReporteDiario {
    fecha: string;
    totalVentas: number;
    totalCosto: number;
    totalUtilidad: number;
    cantidadVentas: number;
    porMetodo: Record<MetodoPago, { total: number; cantidad: number }>;
    // Nuevo: Desglose por tipo/categoría de venta
    desglose: {
        pedidos: DesgloseCategoria; // Ventas vía delivery/pedidos
        kilo: DesgloseCategoria;    // Ventas de productos a granel
        saco: DesgloseCategoria;    // Ventas de sacos cerrados
    };
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

    const desglose: ReporteDiario['desglose'] = {
        pedidos: { total: 0, cantidad: 0 },
        kilo: { total: 0, cantidad: 0 },
        saco: { total: 0, cantidad: 0 },
    };

    ventasHoy.forEach((v) => {
        porMetodo[v.metodo_pago].total += v.total_venta;
        porMetodo[v.metodo_pago].cantidad++;

        // Identificar si es un pedido
        const esPedido = db.pedidos.some(p => p.id_venta === v.id_venta);
        if (esPedido) {
            desglose.pedidos.total += v.total_venta;
            desglose.pedidos.cantidad++;
        }

        // Analizar items para Kilo vs Saco (items están en JSONB en ventas en Supabase)
        const itemsVenta = Array.isArray(v.items) ? (v.items as any[]) : [];
        itemsVenta.forEach(item => {
            const prod = getProducto(item.id);
            if (!prod) return;
            
            if (prod.venta_a_granel) {
                desglose.kilo.total += (item.qty * item.precio);
                desglose.kilo.cantidad++;
            } else if (prod.id_producto_suelto) {
                desglose.saco.total += (item.qty * item.precio);
                desglose.saco.cantidad++;
            }
        });
    });

    const ventas = ventasHoy.map((v) => {
        const itemsVenta = Array.isArray(v.items) ? (v.items as any[]) : [];
        return {
            ...v,
            items: itemsVenta.map((it) => ({
                id_detalle: '', // placeholder simple
                id_venta: v.id_venta,
                id_producto: it.id.toString(),
                cantidad: it.qty,
                subtotal: it.qty * it.precio,
                producto: getProducto(it.id.toString())
            }))
        };
    });

    return { fecha: dayStr, totalVentas, totalCosto, totalUtilidad, cantidadVentas: ventasHoy.length, porMetodo, desglose, ventas };
}

// ── 10. UTILIDADES ───────────────────────────────────────────
export const getProductosBajoStock = (): Producto[] =>
    db.productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo);

export const getProductosSinStock = (): Producto[] =>
    db.productos.filter((p) => p.stock_actual === 0);

export const getHistorialProducto = (id: string): MovimientoStock[] =>
    db.movimientos_stock.filter((m) => m.id_producto === id);

// ── 11. UTILIDAD DE FORMATO ──────────────────────────────────
export function formatDecimalCLP(n: number | string | undefined | null): string {
    if (n === undefined || n === null || n === '') return '';
    const val = typeof n === 'number' ? n : parseFloat(n.toString().replace(/\./g, '').replace(',', '.'));
    if (isNaN(val)) return '';
    return new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(val);
}

export function parseDecimalCLP(s: string): number {
    if (!s) return 0;
    // 1. Eliminar todos los puntos de miles
    let clean = String(s).replace(/\./g, '');
    // 2. Reemplazar la coma decimal por punto
    clean = clean.replace(',', '.');
    // 3. Convertir a número con parseFloat
    const num = parseFloat(clean);
    // 4. Si el valor limpio no es un número válido, tratar como 0 para que nunca aparezca NaN en pantalla
    return isNaN(num) ? 0 : num;
}

/** 
 * Formateador en tiempo real para CLP con decimales (coma).
 * Ejem: "33025,21" -> "33.025,21"
 */
export function formatTypingCLP(s: string | undefined | null): string {
    if (s === undefined || s === null || s === '') return '';
    
    // 1. Quitar todos los puntos previos (miles) para no duplicar
    let clean = String(s).replace(/\./g, '');
    
    // 2. Quedarnos solo con números y una coma
    clean = clean.replace(/[^0-9,]/g, '');

    // Si hay más de una coma, nos quedamos solo con la primera
    const parts = clean.split(',');
    if (parts.length > 2) {
        clean = parts[0] + ',' + parts.slice(1).join('');
    }

    const finalParts = clean.split(',');
    let integerPart = finalParts[0];
    let decimalPart = finalParts.length > 1 ? finalParts[1] : null;

    // 3. Formatear parte entera con puntos cada 3 dígitos
    if (integerPart) {
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // 4. Reensamblar con la coma si existía
    if (decimalPart !== null) {
        return integerPart + ',' + decimalPart;
    }
    return integerPart;
}

export function fmtMoney(n: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
    }).format(n);
}

/** Formatea un número con puntos de miles (sin signo $) */
export function formatCLP(n: number | string | undefined | null): string {
    if (n === undefined || n === null || n === '') return '';
    const val = typeof n === 'number' ? Math.floor(n) : parseInt(n.toString().replace(/\D/g, ''));
    if (isNaN(val)) return '';
    return new Intl.NumberFormat('es-CL').format(val);
}

/** Limpia puntos y convierte string formateado a número puro */
export function parseCLP(s: string): number {
    const clean = s.replace(/\./g, '').replace(/[^\d]/g, '');
    return parseInt(clean) || 0;
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
    desglose: {
        pedidos: number;
        kilo: number;
        saco: number;
    };
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

export interface ReporteMensual {
    totalVentas: number;
    totalCosto: number;
    totalUtilidad: number;
    cantidadVentas: number;
    margenPromedio: number;
    ticketPromedio: number;
    desglose: {
        pedidos: { total: number; cantidad: number };
        kilo: { total: number; cantidad: number };
        saco: { total: number; cantidad: number };
    };
    topProducto?: {
        nombre: string;
        emoji: string;
        totalBruto: number;
        cantidad: number;
    };
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

        const desgloseTotal = { pedidos: 0, kilo: 0, saco: 0 };

        ventasDia.forEach((v) => {
            porMetodo[v.metodo_pago].total += v.total_venta;
            porMetodo[v.metodo_pago].cantidad++;

            const esPedido = db.pedidos.some(p => p.id_venta === v.id_venta);
            if (esPedido) desgloseTotal.pedidos += v.total_venta;

            const itemsVenta = Array.isArray(v.items) ? (v.items as any[]) : [];
            itemsVenta.forEach(it => {
                const prod = getProducto(it.id);
                if (!prod) return;
                if (prod.venta_a_granel) desgloseTotal.kilo += (it.qty * it.precio);
                else if (prod.id_producto_suelto) desgloseTotal.saco += (it.qty * it.precio);
            });
        });

        // Top productos del día
        const conteo: Record<string, { nombre: string; emoji: string; cantidad: number }> = {};
        ventasDia.forEach((v) => {
            const itemsVenta = Array.isArray(v.items) ? (v.items as any[]) : [];
            itemsVenta.forEach((it) => {
                const prod = getProducto(it.id);
                if (!prod) return;
                const pid = it.id;
                if (!conteo[pid]) conteo[pid] = { nombre: prod.nombre, emoji: prod.emoji, cantidad: 0 };
                conteo[pid].cantidad += it.qty;
            });
        });
        const topProductos = Object.values(conteo)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 3);

        const dayLabel = `${DIAS_ES[d.getDay()]} ${d.getDate()}`;
        dias.push({ fecha: d, label: dayLabel, totalVentas, totalCosto, totalUtilidad, cantidadVentas: ventasDia.length, porMetodo, desglose: desgloseTotal, topProductos });
    }

    const totalSemana = dias.reduce((s, d) => s + d.totalVentas, 0);
    const totalCostoSemana = dias.reduce((s, d) => s + d.totalCosto, 0);
    const totalUtilidadSemana = dias.reduce((s, d) => s + d.totalUtilidad, 0);
    const cantidadSemana = dias.reduce((s, d) => s + d.cantidadVentas, 0);
    const maxDiario = Math.max(...dias.map((d) => d.totalVentas), 1);

    return { dias, totalSemana, totalCostoSemana, totalUtilidadSemana, cantidadSemana, maxDiario };
}

// ── 13. REPORTE MENSUAL ──────────────────────────────────────
export function getReporteMensual(year: number, month: number): ReporteMensual {
    const ventasMes = db.ventas.filter((v) => {
        const d = new Date(v.fecha_hora);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const totalVentas = ventasMes.reduce((s, v) => s + v.total_venta, 0);
    const totalCosto = ventasMes.reduce((s, v) => s + (v.total_costo || 0), 0);
    const totalUtilidad = ventasMes.reduce((s, v) => s + (v.utilidad || 0), 0);
    const cantidadVentas = ventasMes.length;

    const margenPromedio = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0;
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

    const desglose = {
        pedidos: { total: 0, cantidad: 0 },
        kilo: { total: 0, cantidad: 0 },
        saco: { total: 0, cantidad: 0 },
    };

    const conteoProd: Record<string, { nombre: string; emoji: string; totalBruto: number; cantidad: number }> = {};

    ventasMes.forEach((v) => {
        const esPedido = db.pedidos.some((p) => p.id_venta === v.id_venta);
        if (esPedido) {
            desglose.pedidos.total += v.total_venta;
            desglose.pedidos.cantidad++;
        }

        const itemsVenta = Array.isArray(v.items) ? (v.items as any[]) : [];
        itemsVenta.forEach((it) => {
            const prod = getProducto(it.id);
            if (!prod) return;

            const sub = it.qty * it.precio;
            if (prod.venta_a_granel) {
                desglose.kilo.total += sub;
                desglose.kilo.cantidad++;
            } else if (prod.id_producto_suelto) {
                desglose.saco.total += sub;
                desglose.saco.cantidad++;
            }

            const pid = it.id;
            if (!conteoProd[pid]) {
                conteoProd[pid] = { nombre: prod.nombre, emoji: prod.emoji, totalBruto: 0, cantidad: 0 };
            }
            conteoProd[pid].totalBruto += sub;
            conteoProd[pid].cantidad += it.qty;
        });
    });

    const topProducto = Object.values(conteoProd).sort((a, b) => b.totalBruto - a.totalBruto)[0];

    return {
        totalVentas,
        totalCosto,
        totalUtilidad,
        cantidadVentas,
        margenPromedio,
        ticketPromedio,
        desglose,
        topProducto,
    };
}

// ── 14. LÓGICA DE SACOS ──────────────────────────────────────
export async function abrirSaco(idSaco: string): Promise<{ ok: boolean; error?: string }> {
    const saco = getProducto(idSaco);
    if (!saco) return { ok: false, error: 'Saco no encontrado' };
    if (!saco.id_producto_suelto || !saco.kilos_por_saco) 
        return { ok: false, error: 'Este producto no es un saco vinculable' };
    if (saco.stock_actual < 1) 
        return { ok: false, error: 'No hay stock de este saco' };

    const suelto = getProducto(saco.id_producto_suelto);
    if (!suelto) return { ok: false, error: 'Producto suelto vinculado no encontrado' };

    try {
        // Proceso: Restar 1 saco, Sumar kilos al suelto
        const stockSaco = saco.stock_actual - 1;
        const stockSuelto = suelto.stock_actual + saco.kilos_por_saco;

        await Promise.all([
            supabase.from('productos').update({ stock: stockSaco }).eq('id', saco.id),
            supabase.from('productos').update({ stock: stockSuelto }).eq('id', suelto.id)
        ]);

        await syncFromCloud();
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

// ── 14. FACTURAS ─────────────────────────────────────────────

// ── 14. FACTURAS ─────────────────────────────────────────────

export async function agregarFactura(data: Omit<Factura, 'id'>, usuario?: string): Promise<Factura | null> {
    const { data: newFact, error } = await supabase
        .from('facturas')
        .insert([{
            numero: data.numero,
            proveedor: data.proveedor_cliente,
            descripcion: data.descripcion,
            monto_total: data.monto_total,
            fecha_emision: data.fecha_emision,
            fecha_vencimiento: data.fecha_vencimiento,
            estado: data.estado,
            items: data.items,
            registrado_por: usuario
        }])
        .select()
        .single();

    if (error) throw new Error(`Supabase error: ${error.message} (${error.code})`);
    
    // Actualizar caché local inmediatamente sin esperar syncFromCloud
    if (newFact) {
        db.facturas.push({ ...newFact as any, proveedor_cliente: (newFact as any).proveedor });
        await registrarAuditoria(usuario || 'Sistema', `Factura creada: ${data.numero}`, 'Facturas', `Proveedor: ${data.proveedor_cliente}, Monto: ${fmtMoney(data.monto_total)}`);
    }
    syncFromCloud(); // En segundo plano, sin await
    return newFact as any;
}

export async function actualizarEstadoFactura(id: string, estado: EstadoFactura, usuario?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('facturas')
            .update({ estado })
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();
        return true;
    } catch (e) {
        console.error('Error al actualizar estado factura:', e);
        return false;
    }
}

export async function editarFactura(id: string, data: Partial<Omit<Factura, 'id'>>, usuario?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('facturas')
            .update({
                numero: data.numero,
                proveedor: data.proveedor_cliente,
                descripcion: data.descripcion,
                monto_total: data.monto_total,
                estado: data.estado
            })
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();

        await registrarAuditoria(usuario || 'Sistema', `Factura editada: ${data.numero}`, 'Facturas', `ID: ${id}`);

        return true;
    } catch (e) {
        console.error('Error al editar factura:', e);
        return false;
    }
}

export async function pagarFactura(id: string, metodo: string, banco: string, responsable: string, fecha: string, usuario?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('facturas')
            .update({
                estado: EstadoFactura.Pagada,
                metodo_pago: metodo,
                banco: banco,
                pagado_por: responsable,
                fecha_pago: fecha
            })
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();

        await registrarAuditoria(usuario || 'Sistema', `Factura pagada: ${id}`, 'Facturas', `Método: ${metodo}${banco ? ` (${banco})` : ''}, Responsable: ${responsable}`);

        return true;
    } catch (e) {
        console.error('Error al pagar factura:', e);
        return false;
    }
}

export async function cancelarPago(id: string, usuario?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('facturas')
            .update({
                estado: EstadoFactura.PorPagar,
                metodo_pago: null,
                banco: null,
                pagado_por: null,
                fecha_pago: null
            })
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();
        return true;
    } catch (e) {
        console.error('Error al cancelar pago:', e);
        return false;
    }
}

export async function reactivarFactura(id: string, usuario?: string): Promise<boolean> {
    return actualizarEstadoFactura(id, EstadoFactura.PorPagar, usuario);
}

export function getFacturas(): Factura[] {
    // Note: here we sort or filter the local db cache
    return db.facturas;
}

// ── 15. CLIENTES (CRM) ────────────────────────────────────────
export async function crearCliente(data: Omit<Cliente, 'id' | 'total_compras' | 'fecha_registro'>): Promise<Cliente | null> {
    try {
        const { data: newClient, error } = await supabase
            .from('clientes')
            .insert([{
                nombre: data.nombre,
                telefono: data.telefono,
                email: data.email,
                deuda: data.deuda || 0,
                frecuente: data.frecuente || false
            }])
            .select()
            .single();

        if (error) throw error;
        await syncFromCloud();
        return newClient as any;
    } catch (e) {
        console.error('Error al crear cliente:', e);
        return null;
    }
}

export async function editarCliente(id: string, data: Partial<Omit<Cliente, 'id' | 'total_compras' | 'fecha_registro'>>): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('clientes')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();
        return true;
    } catch (e) {
        console.error('Error al editar cliente:', e);
        return false;
    }
}

export function getClientes(): Cliente[] {
    return db.clientes.sort((a, b) => (b.total_compras || 0) - (a.total_compras || 0));
}

export function getClienteByPhone(phone: string): Cliente | undefined {
    return db.clientes.find(c => c.telefono === phone);
}

// ── 16. PEDIDOS (DELIVERY) ────────────────────────────────────
export async function crearPedido(data: Omit<Pedido, 'id' | 'fecha_creacion'>, usuario?: string): Promise<Pedido | null> {
    try {
        const { data: newPed, error } = await supabase
            .from('pedidos')
            .insert([{
                id_cliente: data.id_cliente,
                items: data.items,
                total: data.total,
                estado: data.estado,
                metodo_pago: data.metodo_pago,
                nota_delivery: data.nota_delivery
            }])
            .select()
            .single();

        if (error) throw error;
        await syncFromCloud();

        await registrarAuditoria(usuario || 'Sistema', `Pedido creado: ${newPed.id}`, 'Pedidos', `Total: ${fmtMoney(data.total)}`);

        return newPed as any;
    } catch (e) {
        console.error('Error al crear pedido:', e);
        return null;
    }
}

export async function actualizarEstadoPedido(id: string, estado: EstadoPedido, usuario?: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('pedidos')
            .update({ estado })
            .eq('id', id);

        if (error) throw error;

        await syncFromCloud();

        await registrarAuditoria(usuario || 'Sistema', `Estado pedido actualizado: ${estado}`, 'Pedidos', `ID: ${id}`);

        return true;
    } catch (e) {
        console.error('Error al actualizar pedido:', e);
        return false;
    }
}

export async function editarPedido(id: string, data: { nota_delivery?: string; metodo_pago?: MetodoPago }): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('pedidos')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        await syncFromCloud();
        return true;
    } catch (e) {
        console.error('Error al editar pedido:', e);
        return false;
    }
}

export function getPedidos(): Pedido[] {
    return db.pedidos.slice().reverse(); // Show most recent first
}

/** Eliminar una factura por su id */
export async function eliminarFactura(id: string, usuario = 'Sistema'): Promise<boolean> {
    const { error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Supabase error: ${error.message} (${error.code})`);
    
    // Actualizar caché local inmediatamente
    db.facturas = db.facturas.filter(f => f.id !== id);
    syncFromCloud(); // En segundo plano

    await registrarAuditoria(usuario, `Factura eliminada: ${id}`, 'Facturas', '');

    return true;
}
