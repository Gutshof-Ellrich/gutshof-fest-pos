const express = require("express");
const { db, nowIso, safeString } = (() => {
  const Database = require("better-sqlite3");
  const path = require("path");
  const fs = require("fs");
  const DATA_DIR = path.join(__dirname, "data");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const DB_FILE = path.join(DATA_DIR, "pos.db");
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return {
    db,
    nowIso: () => new Date().toISOString(),
    safeString: (v, fb = "") => (v == null ? fb : String(v)),
  };
})();

// Create kitchen tables
db.exec(`
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_number TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL,
  done_at TEXT
);

CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kitchen_order_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  note TEXT,
  FOREIGN KEY(kitchen_order_id) REFERENCES kitchen_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_items_order ON kitchen_order_items(kitchen_order_id);

CREATE TABLE IF NOT EXISTS kitchen_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// Ensure defaults
const ensureSetting = db.prepare(
  `INSERT OR IGNORE INTO kitchen_settings (key, value) VALUES (?, ?)`
);
ensureSetting.run("enabled", "true");
ensureSetting.run("warn_minutes", "5");

const router = express.Router();

// --- GET open kitchen orders ---
router.get("/api/kitchen/orders", (req, res) => {
  try {
    const orders = db
      .prepare(
        `SELECT id, order_id, order_number, status, created_at, done_at
         FROM kitchen_orders
         WHERE status = 'OPEN'
         ORDER BY datetime(created_at) ASC`
      )
      .all();

    const getItems = db.prepare(
      `SELECT product_name, qty, note FROM kitchen_order_items WHERE kitchen_order_id = ? ORDER BY id ASC`
    );

    const result = orders.map((o) => ({
      ...o,
      items: getItems.all(o.id),
    }));

    res.json({ ok: true, orders: result });
  } catch (err) {
    console.error("[GET /api/kitchen/orders]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- POST create kitchen order ---
router.post("/api/kitchen/orders", (req, res) => {
  try {
    const body = req.body || {};
    const id =
      safeString(body.id) ||
      `ko-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const orderId = safeString(body.orderId || body.order_id);
    const orderNumber = safeString(body.orderNumber || body.order_number);
    const items = Array.isArray(body.items) ? body.items : [];
    const ts = safeString(body.createdAt) || nowIso();

    if (items.length === 0) {
      return res.json({ ok: true, skipped: true, reason: "no food items" });
    }

    const insertOrder = db.prepare(
      `INSERT OR REPLACE INTO kitchen_orders (id, order_id, order_number, status, created_at) VALUES (?, ?, ?, 'OPEN', ?)`
    );
    const insertItem = db.prepare(
      `INSERT INTO kitchen_order_items (kitchen_order_id, product_name, qty, note) VALUES (?, ?, ?, ?)`
    );

    db.transaction(() => {
      insertOrder.run(id, orderId, orderNumber, ts);
      for (const item of items) {
        insertItem.run(
          id,
          safeString(item.name || item.product_name || "?"),
          Number(item.qty || item.quantity || 1),
          safeString(item.note || "")
        );
      }
    })();

    res.json({ ok: true, id });
  } catch (err) {
    console.error("[POST /api/kitchen/orders]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- POST mark done ---
router.post("/api/kitchen/order/:id/done", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare(
      `UPDATE kitchen_orders SET status = 'DONE', done_at = ? WHERE id = ?`
    ).run(nowIso(), id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/kitchen/order/:id/done]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Kitchen settings ---
router.get("/api/settings/kitchen", (req, res) => {
  try {
    const rows = db
      .prepare(`SELECT key, value FROM kitchen_settings`)
      .all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({
      ok: true,
      enabled: settings.enabled === "true",
      warn_minutes: Number(settings.warn_minutes) || 5,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/api/settings/kitchen", (req, res) => {
  try {
    const body = req.body || {};
    const upsert = db.prepare(
      `INSERT OR REPLACE INTO kitchen_settings (key, value) VALUES (?, ?)`
    );
    if (body.enabled !== undefined)
      upsert.run("enabled", body.enabled ? "true" : "false");
    if (body.warn_minutes !== undefined)
      upsert.run("warn_minutes", String(Number(body.warn_minutes) || 5));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
