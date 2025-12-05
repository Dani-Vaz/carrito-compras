import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Crea un pool de conexiones para mejor rendimiento y reutilización
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "carrito_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Utilidad opcional: comprobar la conexión al iniciar
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT 1 AS ok");
    conn.release();
    console.log("✓ Conexión MySQL OK:", rows[0]);
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error("Verifica tus variables en .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) y que MySQL esté activo.");
    process.exit(1);
  }
}
