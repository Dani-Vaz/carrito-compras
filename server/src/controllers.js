// server/src/controllers.js
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import PDFDocument from "pdfkit";

// AUTH
export const Auth = {
  async register(req, res) {
    const { name, email, password, address, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: "Faltan datos obligatorios" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, address, phone) VALUES (?, ?, ?, ?, ?)",
        [name, email, hash, address || "", phone || ""]
      );
      return res.json({ ok: true, message: "Registro exitoso" });
    } catch (e) {
      return res.status(400).json({ ok: false, message: "Correo ya registrado" });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, message: "Faltan credenciales" });
    const [[user]] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (!user) return res.status(400).json({ ok: false, message: "Usuario no encontrado" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ ok: false, message: "Credenciales inválidas" });
    req.session.user = { id: user.id, name: user.name, email: user.email };
    return res.json({ ok: true, user: req.session.user });
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.json({ ok: true, message: "Sesión cerrada" });
    });
  }
};

// PRODUCTS
export const Products = {
  async list(req, res) {
    const [rows] = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    return res.json({ ok: true, products: rows });
  },

  async getById(req, res) {
    const { id } = req.params;
    const [[p]] = await pool.query("SELECT * FROM products WHERE id=?", [id]);
    if (!p) return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    return res.json({ ok: true, product: p });
  }
};

// ORDERS
export const Orders = {
  async checkout(req, res) {
    // items: [{ productId, quantity, price }], total: number
    const userId = req.session.user.id;
    const { items, total } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "Carrito vacío" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Recalcular total en servidor por seguridad
      let serverTotal = 0;
      for (const it of items) {
        const [[p]] = await conn.query("SELECT price, stock FROM products WHERE id=?", [it.productId]);
        if (!p) throw new Error(`Producto ${it.productId} no existe`);
        if (p.stock < it.quantity) throw new Error(`Stock insuficiente para ${it.productId}`);
        serverTotal += Number(p.price) * Number(it.quantity);
      }

      // Comparar totals (tolerancia mínima)
      if (Math.abs(serverTotal - Number(total)) > 0.01) {
        throw new Error("Total no coincide con precios del servidor");
      }

      const [orderRes] = await conn.query("INSERT INTO orders (user_id, total) VALUES (?, ?)", [userId, serverTotal]);
      const orderId = orderRes.insertId;

      for (const it of items) {
        await conn.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, it.productId, it.quantity, it.price]
        );
        await conn.query("UPDATE products SET stock = stock - ? WHERE id=? AND stock >= ?", [it.quantity, it.productId, it.quantity]);
      }

      await conn.commit();
      return res.json({ ok: true, orderId });
    } catch (e) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: e.message || "Error procesando la orden" });
    } finally {
      conn.release();
    }
  },

  async history(req, res) {
    const userId = req.session.user.id;
    const [orders] = await pool.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", [userId]);
    const orderIds = orders.map(o => o.id);
    let items = [];
    if (orderIds.length) {
      const [rows] = await pool.query(
        `SELECT oi.*, p.title FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id IN (${orderIds.join(",")})`
      );
      items = rows;
    }
    return res.json({ ok: true, orders, items });
  },

  async ticketPdf(req, res) {
    const userId = req.session.user.id;
    const { orderId } = req.body;
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id=? AND user_id=?", [orderId, userId]);
    if (!order) return res.status(404).json({ ok: false, message: "Orden no encontrada" });

    const [items] = await pool.query(
      "SELECT oi.*, p.title FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?",
      [orderId]
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ticket_${orderId}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("Ticket de compra", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Orden #${order.id}`);
    doc.text(`Cliente: ${req.session.user.name} (${req.session.user.email})`);
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleString()}`);
    doc.moveDown();

    items.forEach(i => {
      doc.text(`${i.title} x${i.quantity} - $${Number(i.price).toFixed(2)} = $${(i.quantity * i.price).toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: $${Number(order.total).toFixed(2)}`, { align: "right" });
    doc.end();
  }
};
