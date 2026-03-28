const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backup");
const DB_FILE = path.join(DATA_DIR, "pos.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  order_type TEXT,
  source_device TEXT,
  role_name TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  payment_method TEXT,
  payment_status TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  customer_note TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  updated_at TEXT NOT NULL,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  category_name TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  item_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  provider_transaction_id TEXT,
  client_transaction_id TEXT,
  terminal_id TEXT,
  created_at TEXT NOT NULL,
  raw_json TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
`);

function nowIso() {
  return new Date().toISOString();
}

function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.round(value * 100);
  const normalized = String(value).replace(",", ".").trim();
  const num = Number(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizeOrder(payload = {}) {
  const ts = nowIso();

  const items = Array.isArray(payload.items) ? payload.items : [];
  const subtotalCents =
    payload.subtotalCents !== undefined
      ? Number(payload.subtotalCents) || 0
      : items.reduce((sum, item) => {
          const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
          const unit = item.unitPriceCents !== undefined
            ? Number(item.unitPriceCents) || 0
            : toCents(item.unitPrice ?? item.price ?? 0);
          return sum + Math.round(qty * unit);
        }, 0);

  const depositCents =
    payload.depositCents !== undefined
      ? Number(payload.depositCents) || 0
      : items.reduce((sum, item) => {
          const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
          const dep = item.depositCents !== undefined
            ? Number(item.depositCents) || 0
            : toCents(item.deposit ?? 0);
          return sum + Math.round(qty * dep);
        }, 0);

  const discountCents =
    payload.discountCents !== undefined ? Number(payload.discountCents) || 0 : 0;

  const totalCents =
    payload.totalCents !== undefined
      ? Number(payload.totalCents) || 0
      : subtotalCents + depositCents - discountCents;

  const orderId =
    safeString(payload.id || payload.orderId || payload.order_id || "").trim() ||
    `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const paymentMethod = safeString(
    payload.paymentMethod || payload.payment_method || "cash"
  ).trim().toLowerCase();

  const paymentStatus = safeString(
    payload.paymentStatus || payload.payment_status || "successful"
  ).trim().toLowerCase();

  return {
    id: orderId,
    order_number: safeString(payload.orderNumber || payload.order_number || ""),
    order_type: safeString(payload.orderType || payload.order_type || ""),
    source_device: safeString(payload.sourceDevice || payload.source_device || ""),
    role_name: safeString(payload.roleName || payload.role_name || ""),
    status: safeString(payload.status || "paid"),
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    currency: safeString(payload.currency || "EUR"),
    subtotal_cents: subtotalCents,
    deposit_cents: depositCents,
    discount_cents: discountCents,
    total_cents: totalCents,
    customer_note: safeString(payload.customerNote || payload.customer_note || ""),
    created_at: safeString(payload.createdAt || payload.created_at || ts),
    paid_at: safeString(payload.paidAt || payload.paid_at || ts),
    updated_at: ts,
    raw_json: JSON.stringify(payload),
    items,
    payment: payload.payment || {}
  };
}

const insertOrderTx = db.transaction((payload) => {
  const order = normalizeOrder(payload);

  db.prepare(`
    INSERT OR REPLACE INTO orders (
      id, order_number, order_type, source_device, role_name, status,
      payment_method, payment_status, currency,
      subtotal_cents, deposit_cents, discount_cents, total_cents,
      customer_note, created_at, paid_at, updated_at, raw_json
    ) VALUES (
      @id, @order_number, @order_type, @source_device, @role_name, @status,
      @payment_method, @payment_status, @currency,
      @subtotal_cents, @deposit_cents, @discount_cents, @total_cents,
      @customer_note, @created_at, @paid_at, @updated_at, @raw_json
    )
  `).run(order);

  db.prepare(`DELETE FROM order_items WHERE order_id = ?`).run(order.id);
  db.prepare(`DELETE FROM payments WHERE order_id = ?`).run(order.id);

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      order_id, product_id, product_name, category_name, quantity,
      unit_price_cents, line_total_cents, deposit_cents, item_note, created_at
    ) VALUES (
      @order_id, @product_id, @product_name, @category_name, @quantity,
      @unit_price_cents, @line_total_cents, @deposit_cents, @item_note, @created_at
    )
  `);

  for (const item of order.items) {
    const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
    const unitPriceCents =
      item.unitPriceCents !== undefined
        ? Number(item.unitPriceCents) || 0
        : toCents(item.unitPrice ?? item.price ?? 0);

    const depositCents =
      item.depositCents !== undefined
        ? Number(item.depositCents) || 0
        : toCents(item.deposit ?? 0);

    const lineTotalCents =
      item.lineTotalCents !== undefined
        ? Number(item.lineTotalCents) || 0
        : Math.round(quantity * unitPriceCents);

    insertItem.run({
      order_id: order.id,
      product_id: safeString(item.productId || item.id || ""),
      product_name: safeString(item.productName || item.name || "Unbekannt"),
      category_name: safeString(item.categoryName || item.category || ""),
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
      deposit_cents: depositCents,
      item_note: safeString(item.note || ""),
      created_at: order.created_at
    });
  }

  const payment = order.payment || {};
  db.prepare(`
    INSERT INTO payments (
      order_id, payment_method, payment_status, amount_cents, provider,
      provider_transaction_id, client_transaction_id, terminal_id,
      created_at, raw_json
    ) VALUES (
      @order_id, @payment_method, @payment_status, @amount_cents, @provider,
      @provider_transaction_id, @client_transaction_id, @terminal_id,
      @created_at, @raw_json
    )
  `).run({
    order_id: order.id,
    payment_method: order.payment_method || "cash",
    payment_status: order.payment_status || "successful",
    amount_cents: order.total_cents,
    provider: safeString(payment.provider || (order.payment_method === "card" ? "sumup" : "")),
    provider_transaction_id: safeString(
      payment.providerTransactionId || payment.transactionId || payment.transaction_id || ""
    ),
    client_transaction_id: safeString(
      payment.clientTransactionId || payment.client_transaction_id || ""
    ),
    terminal_id: safeString(payment.terminalId || payment.readerId || payment.reader_id || ""),
    created_at: order.paid_at || order.created_at,
    raw_json: JSON.stringify(payment)
  });

  return order;
});

function saveOrder(payload) {
  return insertOrderTx(payload);
}

function listOrders(limit = 100) {
  const rows = db.prepare(`
    SELECT
      id, order_number, order_type, role_name, payment_method, payment_status,
      total_cents, created_at, paid_at
    FROM orders
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);

  const getItems = db.prepare(`
    SELECT product_name, quantity, unit_price_cents, line_total_cents, category_name
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `);

  return rows.map((row) => ({
    ...row,
    items: getItems.all(row.id)
  }));
}

function getSummary(dateFrom, dateTo) {
  let where = "";
  const params = [];

  if (dateFrom && dateTo) {
    where = "WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)";
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    where = "WHERE datetime(created_at) >= datetime(?)";
    params.push(dateFrom);
  } else if (dateTo) {
    where = "WHERE datetime(created_at) <= datetime(?)";
    params.push(dateTo);
  }

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS orders_count,
      COALESCE(SUM(total_cents), 0) AS total_cents,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_cents ELSE 0 END), 0) AS cash_cents,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_cents ELSE 0 END), 0) AS card_cents
    FROM orders
    ${where}
  `).get(...params);

  const topProducts = db.prepare(`
    SELECT
      product_name,
      ROUND(SUM(quantity), 2) AS qty,
      COALESCE(SUM(line_total_cents), 0) AS revenue_cents
    FROM order_items
    ${where ? `WHERE order_id IN (SELECT id FROM orders ${where})` : ""}
    GROUP BY product_name
    ORDER BY qty DESC, revenue_cents DESC
    LIMIT 20
  `).all(...params);

  return {
    totals,
    topProducts
  };
}

function createBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `pos-backup-${stamp}.db`);
  db.pragma("wal_checkpoint(FULL)");
  fs.copyFileSync(DB_FILE, file);
  return file;
}

function pruneBackups(days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    const full = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(full);
    if (stat.isFile() && stat.mtimeMs < cutoff) {
      fs.unlinkSync(full);
    }
  }
}

module.exports = {
  db,
  saveOrder,
  listOrders,
  getSummary,
  createBackup,
  pruneBackups,
  paths: {
    DATA_DIR,
    BACKUP_DIR,
    DB_FILE
  }
};
