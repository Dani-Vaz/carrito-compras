import { Producto, ItemCarrito } from "./interfaces";
export declare let carrito: ItemCarrito[];
export declare function agregarAlCarrito(producto: Producto): void;
export declare function eliminarDelCarrito(id: number): void;
export declare function actualizarCantidad(id: number, cantidad: number): void;
export declare function calcularTotal(): number;
//# sourceMappingURL=carrito.d.ts.map