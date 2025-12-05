import { Router } from "express";
import { pool } from "./db.js";

const router = Router();

// ==================== PRODUCTOS ====================

// Obtener todos los productos
router.get("/api/productos", async (req, res) => {
  try {
    const [productos] = await pool.query(
      "SELECT * FROM productos WHERE activo = TRUE ORDER BY id"
    );
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Obtener un producto por ID
router.get("/api/productos/:id", async (req, res) => {
  try {
    const [productos] = await pool.query(
      "SELECT * FROM productos WHERE id = ? AND activo = TRUE",
      [req.params.id]
    );
    
    if (productos.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    res.json(productos[0]);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// Crear producto (admin)
router.post("/api/productos", async (req, res) => {
  try {
    const { nombre, descripcion, precio, emoji, stock } = req.body;
    
    const [result] = await pool.query(
      "INSERT INTO productos (nombre, descripcion, precio, emoji, stock) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, precio, emoji, stock || 0]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      mensaje: "Producto creado exitosamente" 
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// ==================== CARRITO ====================

// Obtener carrito (por session o usuario)
router.get("/api/carrito", async (req, res) => {
  try {
    const sessionId = req.session.id || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.json({ items: [], total: 0 });
    }

    const [items] = await pool.query(`
      SELECT 
        ci.id,
        ci.cantidad,
        ci.precio_unitario,
        p.id as producto_id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.emoji,
        (ci.cantidad * ci.precio_unitario) as subtotal
      FROM carrito_items ci
      JOIN carritos c ON ci.carrito_id = c.id
      JOIN productos p ON ci.producto_id = p.id
      WHERE c.id = (
        SELECT id FROM carritos 
        WHERE usuario_id IS NULL 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    `);

    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    res.json({ items, total });
  } catch (error) {
    console.error("Error al obtener carrito:", error);
    res.status(500).json({ error: "Error al obtener carrito" });
  }
});

// Agregar producto al carrito
router.post("/api/carrito", async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { producto_id, cantidad = 1 } = req.body;

    // Verificar que el producto existe y tiene stock
    const [productos] = await connection.query(
      "SELECT * FROM productos WHERE id = ? AND activo = TRUE",
      [producto_id]
    );

    if (productos.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const producto = productos[0];

    if (producto.stock < cantidad) {
      throw new Error("Stock insuficiente");
    }

    // Obtener o crear carrito
    let [carritos] = await connection.query(
      "SELECT id FROM carritos WHERE usuario_id IS NULL ORDER BY created_at DESC LIMIT 1"
    );

    let carritoId;
    if (carritos.length === 0) {
      const [result] = await connection.query(
        "INSERT INTO carritos (usuario_id) VALUES (NULL)"
      );
      carritoId = result.insertId;
    } else {
      carritoId = carritos[0].id;
    }

    // Verificar si el producto ya está en el carrito
    const [itemsExistentes] = await connection.query(
      "SELECT * FROM carrito_items WHERE carrito_id = ? AND producto_id = ?",
      [carritoId, producto_id]
    );

    if (itemsExistentes.length > 0) {
      // Actualizar cantidad
      await connection.query(
        "UPDATE carrito_items SET cantidad = cantidad + ? WHERE id = ?",
        [cantidad, itemsExistentes[0].id]
      );
    } else {
      // Insertar nuevo item
      await connection.query(
        "INSERT INTO carrito_items (carrito_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [carritoId, producto_id, cantidad, producto.precio]
      );
    }

    await connection.commit();
    res.json({ mensaje: "Producto agregado al carrito" });

  } catch (error) {
    await connection.rollback();
    console.error("Error al agregar al carrito:", error);
    res.status(500).json({ error: error.message || "Error al agregar al carrito" });
  } finally {
    connection.release();
  }
});

// Actualizar cantidad de un item
router.put("/api/carrito/:itemId", async (req, res) => {
  try {
    const { cantidad } = req.body;
    const { itemId } = req.params;

    if (cantidad <= 0) {
      await pool.query("DELETE FROM carrito_items WHERE id = ?", [itemId]);
      return res.json({ mensaje: "Item eliminado del carrito" });
    }

    await pool.query(
      "UPDATE carrito_items SET cantidad = ? WHERE id = ?",
      [cantidad, itemId]
    );

    res.json({ mensaje: "Cantidad actualizada" });
  } catch (error) {
    console.error("Error al actualizar carrito:", error);
    res.status(500).json({ error: "Error al actualizar carrito" });
  }
});

// Eliminar item del carrito
router.delete("/api/carrito/:itemId", async (req, res) => {
  try {
    await pool.query("DELETE FROM carrito_items WHERE id = ?", [req.params.itemId]);
    res.json({ mensaje: "Item eliminado del carrito" });
  } catch (error) {
    console.error("Error al eliminar del carrito:", error);
    res.status(500).json({ error: "Error al eliminar del carrito" });
  }
});

// Vaciar carrito
router.delete("/api/carrito", async (req, res) => {
  try {
    const [carritos] = await pool.query(
      "SELECT id FROM carritos WHERE usuario_id IS NULL ORDER BY created_at DESC LIMIT 1"
    );

    if (carritos.length > 0) {
      await pool.query("DELETE FROM carrito_items WHERE carrito_id = ?", [carritos[0].id]);
    }

    res.json({ mensaje: "Carrito vaciado" });
  } catch (error) {
    console.error("Error al vaciar carrito:", error);
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
});

// ==================== PEDIDOS ====================

// Crear pedido (checkout)
router.post("/api/pedidos", async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { nombre_cliente, email_cliente, direccion, telefono, ciudad, codigo_postal } = req.body;

    // Obtener carrito actual
    const [carritos] = await connection.query(
      "SELECT id FROM carritos WHERE usuario_id IS NULL ORDER BY created_at DESC LIMIT 1"
    );

    if (carritos.length === 0) {
      throw new Error("No hay carrito activo");
    }

    const carritoId = carritos[0].id;

    // Obtener items del carrito
    const [items] = await connection.query(`
      SELECT ci.*, p.stock 
      FROM carrito_items ci
      JOIN productos p ON ci.producto_id = p.id
      WHERE ci.carrito_id = ?
    `, [carritoId]);

    if (items.length === 0) {
      throw new Error("El carrito está vacío");
    }

    // Verificar stock
    for (const item of items) {
      if (item.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para producto ID ${item.producto_id}`);
      }
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.cantidad * parseFloat(item.precio_unitario)), 0);

    // Crear pedido
    const [pedidoResult] = await connection.query(
      `INSERT INTO pedidos (usuario_id, total, nombre_cliente, email_cliente, direccion, telefono, ciudad, codigo_postal, estado)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [total, nombre_cliente, email_cliente, direccion, telefono, ciudad, codigo_postal]
    );

    const pedidoId = pedidoResult.insertId;

    // Insertar items del pedido y actualizar stock
    for (const item of items) {
      await connection.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
      );

      await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [item.cantidad, item.producto_id]
      );
    }

    // Vaciar carrito
    await connection.query("DELETE FROM carrito_items WHERE carrito_id = ?", [carritoId]);
    await connection.query("DELETE FROM carritos WHERE id = ?", [carritoId]);

    await connection.commit();

    res.status(201).json({ 
      pedido_id: pedidoId,
      total,
      mensaje: "Pedido creado exitosamente" 
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: error.message || "Error al crear pedido" });
  } finally {
    connection.release();
  }
});

// Obtener todos los pedidos
router.get("/api/pedidos", async (req, res) => {
  try {
    const [pedidos] = await pool.query(`
      SELECT 
        p.*,
        COUNT(pi.id) as total_items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// Obtener detalle de un pedido
router.get("/api/pedidos/:id", async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      "SELECT * FROM pedidos WHERE id = ?",
      [req.params.id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const [items] = await pool.query(`
      SELECT 
        pi.*,
        p.nombre,
        p.emoji
      FROM pedido_items pi
      JOIN productos p ON pi.producto_id = p.id
      WHERE pi.pedido_id = ?
    `, [req.params.id]);

    res.json({ ...pedidos[0], items });
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
});

export default router;