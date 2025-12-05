// server/src/middlewares.js
export function ensureAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    // Para peticiones API JSON respondemos con 401
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(401).json({ ok: false, message: "Autenticación requerida" });
    }
    // Para navegación normal redirigimos al login
    return res.redirect("/login?mensaje=Debes iniciar sesión");
  }
  
  export function exposeSession(req, res, next) {
    res.locals.user = req.session?.user || null;
    res.locals.flash = req.query?.mensaje || "";
    next();
  }
  