// ============================================================
//  server.js  –  Backend REST E-commerce
//  Node.js + Express + File System (fs)
// ============================================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rutas a los archivos JSON de persistencia ──────────────
const DB_PRODUCTOS = path.join(__dirname, 'data', 'productos.json');
const DB_VENTAS    = path.join(__dirname, 'data', 'ventas.json');

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers File System ────────────────────────────────────
/**
 * Lee un archivo JSON y retorna el array/objeto parseado.
 * @param {string} filePath
 * @returns {Array|Object}
 */
function leerJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Escribe datos en un archivo JSON con formato legible.
 * @param {string} filePath
 * @param {*} data
 */
function escribirJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
//  RUTAS
// ============================================================

// ── GET /  → Sirve la SPA (index.html) ────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ────────────────────────────────────────────────────────────
//  PRODUCTOS
// ────────────────────────────────────────────────────────────

/**
 * GET /productos
 * Retorna todos los productos activos con su stock.
 */
app.get('/productos', (req, res) => {
  try {
    const productos = leerJSON(DB_PRODUCTOS);
    // Solo retornar activos (puedes quitar el filtro si quieres ver todos)
    const activos = productos.filter(p => p.activo);
    res.status(200).json(activos);
  } catch (err) {
    console.error('GET /productos →', err.message);
    res.status(500).json({ error: 'Error al leer productos.', detalle: err.message });
  }
});

/**
 * POST /producto
 * Registra un nuevo producto.
 * Body: { nombre, precio, stock }
 */
app.post('/producto', (req, res) => {
  try {
    const { nombre, precio, stock } = req.body;

    // Validaciones básicas
    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Faltan campos: nombre, precio y stock son requeridos.' });
    }
    if (typeof precio !== 'number' || precio < 0) {
      return res.status(400).json({ error: 'El precio debe ser un número positivo.' });
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un entero >= 0.' });
    }

    const productos = leerJSON(DB_PRODUCTOS);

    // Generar nuevo id secuencial
    const nuevoId = productos.length > 0
      ? Math.max(...productos.map(p => p.id_producto)) + 1
      : 1;

    const nuevoProducto = {
      id_producto: nuevoId,
      nombre: nombre.trim(),
      precio: parseFloat(precio.toFixed(2)),
      activo: true,
      stock
    };

    productos.push(nuevoProducto);
    escribirJSON(DB_PRODUCTOS, productos);

    res.status(201).json({ mensaje: 'Producto creado.', producto: nuevoProducto });
  } catch (err) {
    console.error('POST /producto →', err.message);
    res.status(500).json({ error: 'Error al crear producto.', detalle: err.message });
  }
});

/**
 * PUT /producto
 * Actualiza un producto existente.
 * Body: { id_producto, nombre?, precio?, stock?, activo? }
 */
app.put('/producto', (req, res) => {
  try {
    const { id_producto, nombre, precio, stock, activo } = req.body;

    if (!id_producto) {
      return res.status(400).json({ error: 'Se requiere id_producto.' });
    }

    const productos = leerJSON(DB_PRODUCTOS);
    const idx = productos.findIndex(p => p.id_producto === id_producto);

    if (idx === -1) {
      return res.status(404).json({ error: `Producto con id ${id_producto} no encontrado.` });
    }

    // Actualizar solo los campos recibidos
    if (nombre  !== undefined) productos[idx].nombre  = nombre.trim();
    if (precio  !== undefined) productos[idx].precio  = parseFloat(parseFloat(precio).toFixed(2));
    if (stock   !== undefined) productos[idx].stock   = parseInt(stock, 10);
    if (activo  !== undefined) productos[idx].activo  = Boolean(activo);

    escribirJSON(DB_PRODUCTOS, productos);
    res.status(200).json({ mensaje: 'Producto actualizado.', producto: productos[idx] });
  } catch (err) {
    console.error('PUT /producto →', err.message);
    res.status(500).json({ error: 'Error al actualizar producto.', detalle: err.message });
  }
});

/**
 * DELETE /producto
 * Elimina (soft-delete) un producto por id.
 * Body: { id_producto }
 */
app.delete('/producto', (req, res) => {
  try {
    const { id_producto } = req.body;

    if (!id_producto) {
      return res.status(400).json({ error: 'Se requiere id_producto.' });
    }

    const productos = leerJSON(DB_PRODUCTOS);
    const idx = productos.findIndex(p => p.id_producto === id_producto);

    if (idx === -1) {
      return res.status(404).json({ error: `Producto con id ${id_producto} no encontrado.` });
    }

    // Soft-delete: marcar como inactivo (así el historial de ventas sigue siendo consistente)
    productos[idx].activo = false;
    escribirJSON(DB_PRODUCTOS, productos);

    res.status(200).json({ mensaje: `Producto ${id_producto} eliminado correctamente.` });
  } catch (err) {
    console.error('DELETE /producto →', err.message);
    res.status(500).json({ error: 'Error al eliminar producto.', detalle: err.message });
  }
});

// ────────────────────────────────────────────────────────────
//  VENTAS
// ────────────────────────────────────────────────────────────

/**
 * GET /ventas
 * Retorna todas las ventas registradas.
 */
app.get('/ventas', (req, res) => {
  try {
    const ventas = leerJSON(DB_VENTAS);
    res.status(200).json(ventas);
  } catch (err) {
    console.error('GET /ventas →', err.message);
    res.status(500).json({ error: 'Error al leer ventas.', detalle: err.message });
  }
});

/**
 * POST /venta
 * Registra una nueva venta desde el carrito.
 * Body: { items: [{ id_producto, cantidad }], id_usuario? }
 *
 * Flujo:
 *  1. Validar payload
 *  2. Verificar stock suficiente para cada ítem
 *  3. Calcular totales
 *  4. Descontar stock en productos.json
 *  5. Guardar venta en ventas.json
 *  6. Responder 201 con la venta creada
 */
app.post('/venta', async (req, res) => {
  try {
    const { items, id_usuario = null } = req.body;

    // ── 1. Validar payload ──────────────────────────────────
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío o el formato es incorrecto. Se espera { items: [{ id_producto, cantidad }] }.' });
    }

    for (const item of items) {
      if (!item.id_producto || !item.cantidad || item.cantidad <= 0) {
        return res.status(400).json({ error: 'Cada ítem debe tener id_producto y cantidad > 0.' });
      }
    }

    // ── 2. Leer productos y verificar stock ─────────────────
    const productos = leerJSON(DB_PRODUCTOS);
    const itemsDetalle = [];

    for (const item of items) {
      const producto = productos.find(p => p.id_producto === item.id_producto && p.activo);

      if (!producto) {
        return res.status(404).json({ error: `Producto con id ${item.id_producto} no encontrado o inactivo.` });
      }

      if (producto.stock < item.cantidad) {
        return res.status(409).json({
          error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}.`
        });
      }

      itemsDetalle.push({
        id_producto:     producto.id_producto,
        nombre:          producto.nombre,
        cantidad:        item.cantidad,
        precio_unitario: producto.precio,
        subtotal:        parseFloat((producto.precio * item.cantidad).toFixed(2))
      });
    }

    // ── 3. Calcular total ───────────────────────────────────
    const total = parseFloat(
      itemsDetalle.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)
    );

    // ── 4. Descontar stock ──────────────────────────────────
    for (const item of itemsDetalle) {
      const idx = productos.findIndex(p => p.id_producto === item.id_producto);
      productos[idx].stock -= item.cantidad;
    }
    escribirJSON(DB_PRODUCTOS, productos);

    // ── 5. Registrar venta ──────────────────────────────────
    const ventas = leerJSON(DB_VENTAS);
    const nuevaVenta = {
      id_venta:  uuidv4(),
      id_usuario,
      fecha:     new Date().toISOString(),
      items:     itemsDetalle,
      total
    };
    ventas.push(nuevaVenta);
    escribirJSON(DB_VENTAS, ventas);

    // ── 6. Responder ────────────────────────────────────────
    res.status(201).json({
      mensaje: '¡Venta registrada exitosamente!',
      venta:   nuevaVenta
    });

  } catch (err) {
    console.error('POST /venta →', err.message);
    res.status(500).json({ error: 'Error interno al procesar la venta.', detalle: err.message });
  }
});

// ── Catch-all: ruta no encontrada ─────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no existe.` });
});

// ── Iniciar servidor ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦  GET  /productos`);
  console.log(`➕  POST /producto`);
  console.log(`✏️   PUT  /producto`);
  console.log(`🗑️   DEL  /producto`);
  console.log(`🛒  POST /venta`);
  console.log(`📋  GET  /ventas\n`);
});
