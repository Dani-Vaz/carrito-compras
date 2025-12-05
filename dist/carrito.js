// 🛒 Estado del carrito
export let carrito = [];
// ➕ Agregar producto al carrito
export function agregarAlCarrito(producto) {
    const item = carrito.find(i => i.producto.id === producto.id);
    if (item) {
        item.cantidad++;
    }
    else {
        carrito.push({ producto, cantidad: 1 });
    }
}
// ❌ Eliminar producto del carrito
export function eliminarDelCarrito(id) {
    carrito = carrito.filter(i => i.producto.id !== id);
}
// 🔁 Actualizar cantidad de un producto
export function actualizarCantidad(id, cantidad) {
    const item = carrito.find(i => i.producto.id === id);
    if (item && cantidad > 0) {
        item.cantidad = cantidad;
    }
    else {
        eliminarDelCarrito(id);
    }
}
// 💰 Calcular total del carrito
export function calcularTotal() {
    return carrito.reduce((total, item) => total + item.producto.precio * item.cantidad, 0);
}
//# sourceMappingURL=carrito.js.map