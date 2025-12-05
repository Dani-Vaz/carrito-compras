// 🔐 Usuario actual simulado en memoria
let usuarioActual = null;
// 📝 Registro de usuario
export function registrar(nombre, email, password) {
    usuarioActual = {
        id: Date.now(),
        nombre,
        email,
        password
    };
    alert(`✅ Usuario registrado: ${nombre}`);
}
// 🔓 Login de usuario
export function login(email, password) {
    if (usuarioActual && usuarioActual.email === email && usuarioActual.password === password) {
        alert(`🔓 Bienvenido, ${usuarioActual.nombre}`);
        return true;
    }
    alert("❌ Credenciales incorrectas");
    return false;
}
// 🔍 Verificar si hay sesión activa
export function estaLogeado() {
    return usuarioActual !== null;
}
//# sourceMappingURL=auth.js.map