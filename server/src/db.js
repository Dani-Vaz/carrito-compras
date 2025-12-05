// server/src/db.js

import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Carga .env solo en desarrollo
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Configuración del pool
export const pool = mysql.createPool({  // ← Cambiado a export const
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "carrito_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Función de prueba de conexión
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT 1 AS ok");
    conn.release();
    console.log("✅ Conexión MySQL OK:", rows[0]);
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error(
      "Verifica tus variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    );
    process.exit(1);
  }
}

// NO usar export default, usar export const