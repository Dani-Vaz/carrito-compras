import { cargarCatalogo } from "./catalogo";
import { agregarAlCarrito, carrito, calcularTotal, actualizarCantidad, eliminarDelCarrito } from "./carrito";
import { estaLogeado } from "./auth";
const catalogoDiv = document.getElementById("catalogo");
const carritoDiv = document.getElementById("carrito");
const totalSpan = document.getElementById("total");
const comprarBtn = document.getElementById("comprar");
cargarCatalogo().then(productos => {
    productos.forEach(p => {
        const card = document.createElement("div");
        card.className = "producto";
        card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" />
      <h3>${p.nombre}</h3>
      <p>${p.descripcion}</p>
      <p>$${p.precio}</p>
      <button>Agregar al carrito</button>
    `;
        card.querySelector("button").addEventListener("click", () => {
            agregarAlCarrito(p);
            renderCarrito();
        });
        catalogoDiv.appendChild(card);
    });
});
function renderCarrito() {
    carritoDiv.innerHTML = "";
    carrito.forEach(item => {
        const row = document.createElement("div");
        row.className = "item-carrito";
        row.innerHTML = `
      <span>${item.producto.nombre}</span>
      <input type="number" value="${item.cantidad}" min="1" />
      <span>$${item.producto.precio * item.cantidad}</span>
      <button>Eliminar</button>
    `;
        row.querySelector("input").addEventListener("change", (e) => {
            const nuevaCantidad = parseInt(e.target.value);
            actualizarCantidad(item.producto.id, nuevaCantidad);
            renderCarrito();
        });
        row.querySelector("button").addEventListener("click", () => {
            eliminarDelCarrito(item.producto.id);
            renderCarrito();
        });
        carritoDiv.appendChild(row);
    });
    totalSpan.textContent = `$${calcularTotal()}`;
}
comprarBtn.addEventListener("click", () => {
    if (!estaLogeado()) {
        alert("❌ Debes iniciar sesión para comprar.");
        return;
    }
    alert(`✅ Compra realizada. Total: ${calcularTotal()}`);
    carrito.length = 0;
    renderCarrito();
});
//# sourceMappingURL=main.js.map