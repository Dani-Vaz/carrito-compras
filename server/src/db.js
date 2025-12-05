// server/src/db.js (o la ruta que uses)

import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Carga .env solo en desarrollo (en Railway las vars ya vienen del entorno)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ⚠ Asegúrate de que DB_NAME coincida con el nombre REAL de tu base
// por ejemplo "carrito_compras" si así se llama en Railway/XAMPP
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "carrito_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Función opcional para probar conexión (puedes llamarla al arrancar el server)
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT 1 AS ok");
    conn.release();
    console.log("✅ Conexión MySQL OK:", rows[0]);
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error(
      "Verifica tus variables de entorno: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME y que MySQL esté activo."
    );
    // En producción puedes quitar el exit si no quieres que tumbe el proceso
    process.exit(1);
  }
}

// Export principal del pool para usarlo en el resto de archivos
export default pool;
