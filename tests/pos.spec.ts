import { test, expect } from '@playwright/test';

// ── Helpers ────────────────────────────────────────────────────────────────
async function irA(page: any, tab: string) {
    await page.getByRole('button', { name: tab }).click();
    await page.waitForTimeout(300);
}

// Helper: crea un pedido desde el POS
async function crearPedido(page: any, telefono: string, nombre: string, direccion: string) {
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await page.locator('.btn-secondary').filter({ hasText: 'CREAR PEDIDO' }).click();
    await expect(page.locator('.modal')).toBeVisible();
    // El placeholder del teléfono es "Ej: +56 9 1234 5678"
    await page.locator('.modal input').nth(0).fill(telefono);
    await page.locator('.modal input').nth(1).fill(nombre);
    await page.locator('.modal input').nth(2).fill(direccion);
    await page.getByRole('button', { name: /Confirmar Pedido/i }).click();
    await page.waitForTimeout(300);
}

// ══════════════════════════════════════════════════════════════════════════
// 1. CARGA INICIAL
// ══════════════════════════════════════════════════════════════════════════
test('la app carga y muestra el header y el POS por defecto', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.logo')).toContainText('FJ');
    await expect(page.locator('.logo')).toContainText('Mascotas');
    await expect(page.locator('.product-card').first()).toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════
// 2. POS — CARRITO Y VENTA
// ══════════════════════════════════════════════════════════════════════════
test('POS: agregar producto al carrito y ver el total', async ({ page }) => {
    await page.goto('/');
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await expect(page.locator('.cart-item').first()).toBeVisible();
    const totalText = await page.locator('.total-amount').textContent();
    expect(totalText).not.toBe('$\u00A00');
});

test('POS: agregar y quitar producto del carrito', async ({ page }) => {
    await page.goto('/');
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await expect(page.locator('.cart-item')).toHaveCount(1);
    await page.locator('.remove-btn').first().click();
    await expect(page.locator('.cart-item')).toHaveCount(0);
    await expect(page.locator('.cart-empty')).toBeVisible();
});

test('POS: finalizar venta y ver toast de confirmación', async ({ page }) => {
    await page.goto('/');
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await page.locator('.checkout-btn').click();
    await expect(page.locator('.toast.success')).toBeVisible();
    await expect(page.locator('.cart-empty')).toBeVisible();
});

test('POS: el botón finalizar venta está deshabilitado con carrito vacío', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.checkout-btn')).toBeDisabled();
});

test('POS: búsqueda por nombre filtra productos', async ({ page }) => {
    await page.goto('/');
    const totalProductos = await page.locator('.product-card').count();
    await page.locator('input[placeholder="Nombre o SKU..."]').fill('Royal');
    const filtrados = await page.locator('.product-card').count();
    expect(filtrados).toBeLessThan(totalProductos);
    expect(filtrados).toBeGreaterThan(0);
});

test('POS: filtro por especie funciona', async ({ page }) => {
    await page.goto('/');
    const totalProductos = await page.locator('.product-card').count();
    await page.locator('.pill').filter({ hasText: 'Gato' }).click();
    const filtrados = await page.locator('.product-card').count();
    expect(filtrados).toBeLessThan(totalProductos);
});

test('POS: cambiar método de pago antes de cobrar', async ({ page }) => {
    await page.goto('/');
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await page.locator('.pay-btn').filter({ hasText: 'Transferencia' }).click();
    await expect(page.locator('.pay-btn.selected')).toContainText('Transferencia');
    await page.locator('.checkout-btn').click();
    await expect(page.locator('.toast.success')).toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════
// 3. NAVEGACIÓN — TODAS LAS PESTAÑAS
// ══════════════════════════════════════════════════════════════════════════
test('navegación: todas las pestañas cargan sin errores', async ({ page }) => {
    await page.goto('/');
    const tabs = ['Pedidos', 'Clientes', 'Inventario', 'Órdenes', 'Diario', 'Semanal', 'Informes', 'Facturas'];
    for (const tab of tabs) {
        await irA(page, tab);
        await expect(page.locator('body')).not.toContainText('Cannot read');
        await expect(page.locator('body')).not.toContainText('undefined is not');
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. INVENTARIO
// ══════════════════════════════════════════════════════════════════════════
test('Inventario: muestra tabla con productos del seed', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Inventario');
    // InventoryScreen usa .table-wrap > table
    await expect(page.locator('.table-wrap table tbody tr').first()).toBeVisible();
});

test('Inventario: botón Nuevo Producto abre modal', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Inventario');
    await page.getByRole('button', { name: /Nuevo Producto/i }).click();
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('Nuevo Producto');
    await page.keyboard.press('Escape');
});

test('Inventario: búsqueda filtra la tabla', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Inventario');
    const total = await page.locator('.table-wrap table tbody tr').count();
    await page.locator('input[placeholder="Nombre o SKU..."]').fill('Royal');
    await page.waitForTimeout(200);
    const filtrados = await page.locator('.table-wrap table tbody tr').count();
    expect(filtrados).toBeLessThan(total);
    expect(filtrados).toBeGreaterThan(0);
});

// ══════════════════════════════════════════════════════════════════════════
// 5. CLIENTES
// ══════════════════════════════════════════════════════════════════════════
test('Clientes: la pantalla carga con stats', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Clientes');
    await expect(page.locator('.summary-card').first()).toBeVisible();
});

test('Clientes: botón editar abre modal con datos del cliente', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1133334444', 'Cliente Test', 'Calle Falsa 123');
    await irA(page, 'Clientes');
    await page.locator('button').filter({ hasText: /Editar/i }).first().click();
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('Editar Cliente');
    await expect(page.locator('.modal input').first()).toHaveValue('Cliente Test');
});

test('Clientes: guardar edición actualiza el nombre', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1122223333', 'Nombre Original', 'Av. Test 999');
    await irA(page, 'Clientes');
    await page.locator('button').filter({ hasText: /Editar/i }).first().click();
    await page.locator('.modal input').first().fill('Nombre Editado');
    await page.getByRole('button', { name: /Guardar Cambios/i }).click();
    // Puede haber varios toasts; verificar que alguno de éxito sea visible
    await expect(page.locator('.toast.success').first()).toBeVisible();
    await expect(page.locator('.inventory-table tbody')).toContainText('Nombre Editado');
});

test('Clientes: buscar por nombre filtra la tabla', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1155556666', 'Juan Prueba', 'Siempreviva 742');
    await irA(page, 'Clientes');
    await page.locator('input[placeholder*="nombre o teléfono"]').fill('Juan');
    await expect(page.locator('.inventory-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.inventory-table tbody')).toContainText('Juan Prueba');
});

// ══════════════════════════════════════════════════════════════════════════
// 6. PEDIDOS
// ══════════════════════════════════════════════════════════════════════════
test('Pedidos: crear pedido y verlo en la lista', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1199998888', 'Ana García', 'Rivadavia 500');
    await irA(page, 'Pedidos');
    await expect(page.locator('.inventory-table tbody')).toContainText('Ana García');
});

test('Pedidos: botón editar abre modal con campos editables', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1177772222', 'Pedro Test', 'Corrientes 1000');
    await irA(page, 'Pedidos');
    await page.locator('button').filter({ hasText: /✏️ Editar/i }).first().click();
    await expect(page.locator('.modal-title')).toContainText('Editar Pedido');
    // El modal tiene textarea para la nota y muestra la dirección
    await expect(page.locator('.modal textarea')).toBeVisible();
    await expect(page.locator('.modal input').first()).toHaveValue('Corrientes 1000');
});

test('Pedidos: editar nota del repartidor y guardar', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1144445555', 'Luis Test', 'Belgrano 200');
    // Esperar que el toast de creación desaparezca para evitar conflicto
    await page.waitForTimeout(3600);
    await irA(page, 'Pedidos');
    await page.locator('button').filter({ hasText: /✏️ Editar/i }).first().click();
    await page.locator('.modal textarea').fill('Timbre roto, tocar puerta');
    await page.getByRole('button', { name: /Guardar Cambios/i }).click();
    await expect(page.locator('.toast.success')).toBeVisible();
});

test('Pedidos: avanzar de Pendiente a En Camino', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1144445556', 'Mario Camino', 'Belgrano 300');
    await page.waitForTimeout(3600);
    await irA(page, 'Pedidos');
    await page.locator('button').filter({ hasText: /En Camino/i }).first().click();
    await expect(page.locator('.toast.success')).toBeVisible();
});

test('Pedidos: copiar mensaje del repartidor muestra toast', async ({ page }) => {
    await page.goto('/');
    await crearPedido(page, '1166667777', 'María Copia', 'Santa Fe 300');
    await page.waitForTimeout(3600);
    await irA(page, 'Pedidos');
    await page.context().grantPermissions(['clipboard-write']);
    await page.locator('button').filter({ hasText: /📋 Repartidor/i }).first().click();
    await expect(page.locator('.toast.success')).toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════
// 7. FACTURAS
// ══════════════════════════════════════════════════════════════════════════
test('Facturas: pantalla carga con botón nueva factura', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Facturas');
    await expect(page.getByRole('button', { name: /Nueva Factura/i })).toBeVisible();
});

test('Facturas: abrir y cerrar modal de nueva factura', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Facturas');
    await page.getByRole('button', { name: /Nueva Factura/i }).click();
    await expect(page.locator('.modal-title')).toContainText('Factura');
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════
// 8. REPORTES
// ══════════════════════════════════════════════════════════════════════════
test('Reporte diario: muestra tarjetas de totales', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Diario');
    // El reporte usa .report-card con .report-card-value
    await expect(page.locator('.report-card').first()).toBeVisible();
});

test('Reporte semanal: muestra gráfico de 7 barras', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Semanal');
    await expect(page.locator('.bar-chart')).toBeVisible();
    await expect(page.locator('.bar-item')).toHaveCount(7);
});

test('Informes: muestra selector de mes y tarjetas', async ({ page }) => {
    await page.goto('/');
    await irA(page, 'Informes');
    await expect(page.locator('input[type="month"]')).toBeVisible();
    await expect(page.locator('.summary-card').first()).toBeVisible();
});

test('Reporte diario: refleja venta recién hecha', async ({ page }) => {
    await page.goto('/');
    await page.locator('.product-card:not(.out-of-stock)').first().click();
    await page.locator('.checkout-btn').click();
    await irA(page, 'Diario');
    const valor = await page.locator('.report-card').first().locator('.report-card-value').textContent();
    expect(valor).not.toMatch(/^\$\s*0$/);
});
