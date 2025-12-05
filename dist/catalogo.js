var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// 📦 Cargar catálogo desde archivo JSON
export function cargarCatalogo() {
    return __awaiter(this, void 0, void 0, function* () {
        const respuesta = yield fetch("productos.json");
        if (!respuesta.ok) {
            throw new Error("Error al cargar el catálogo");
        }
        const productos = yield respuesta.json();
        return productos;
    });
}
//# sourceMappingURL=catalogo.js.map