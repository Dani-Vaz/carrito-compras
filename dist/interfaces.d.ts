export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen: string;
}
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    password: string;
}
export interface ItemCarrito {
    producto: Producto;
    cantidad: number;
}
//# sourceMappingURL=interfaces.d.ts.map