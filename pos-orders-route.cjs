const express = require("express");
const {
  saveOrder,
  listOrders,
  getSummary,
  getDetailedStats,
  createBackup,
  pruneBackups,
  getNextCounter,
  resetCounter,
  getCounterValue,
  paths
} = require("./pos-db.cjs");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const KITCHEN_ORDERS_FILE = path.join(__dirname, "kitchen-orders.json");
const KITCHEN_SETTINGS_FILE = path.join(__dirname, "kitchen-settings.json");

function readJsonFileSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Kitchen JSON READ ERROR] ${file}`, err);
    return fallback;
  }
}

function writeJsonFileSafe(file, value) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`[Kitchen JSON WRITE ERROR] ${file}`, err);
    return false;
  }
}

function loadKitchenOrders() {
  return readJsonFileSafe(KITCHEN_ORDERS_FILE, []);
}

function saveKitchenOrders(list) {
  return writeJsonFileSafe(KITCHEN_ORDERS_FILE, list);
}

function loadKitchenSettings() {
  const defaults = {
    enabled: true,
    warningMinutes: 5,
  };

  const saved = readJsonFileSafe(KITCHEN_SETTINGS_FILE, defaults);

  return {
    enabled: saved.enabled !== false,
    warningMinutes: Math.max(1, parseInt(saved.warningMinutes, 10) || 5),
  };
}

function isFoodItem(item) {
  // Primary: check categoryType field (set by frontend from admin dropdown)
  const cType = String(item.categoryType || "").trim().toLowerCase();
  if (cType === "food") return true;
  if (cType === "drinks") return false;

  // Fallback: keyword matching on category name for legacy orders
  const text = String(item.categoryName || item.category || "").trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes("speise") ||
    text.includes("essen") ||
    text.includes("küche") ||
    text.includes("kueche") ||
    text.includes("food")
  );
}

function normalizeKitchenItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  return items
    .filter((item) => isFoodItem(item))
    .map((item) => ({
      name: String(item.productName || item.name || "Unbekannt"),
      qty: Number(item.quantity ?? item.qty ?? 1) || 1,
      note: String(item.note || "").trim() || null,
    }));
}

function createKitchenOrderFromOrder(order) {
  try {
    const settings = loadKitchenSettings();
    if (!settings.enabled) return;

    const kitchenItems = normalizeKitchenItems(order);
    if (!kitchenItems.length) return;

    const kitchenOrders = loadKitchenOrders();

    const alreadyExists = kitchenOrders.some((entry) => entry.orderId === order.id);
    if (alreadyExists) return;

    kitchenOrders.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `kitchen-${Date.now()}`,
      orderId: String(order.id || ""),
      orderNumber: String(order.order_number || "").trim() || String(order.id || ""),
      status: "OPEN",
      createdAt: order.created_at || new Date().toISOString(),
      doneAt: null,
      customerNote: String(order.customer_note || "").trim() || null,
      items: kitchenItems,
    });

    saveKitchenOrders(kitchenOrders);
  } catch (err) {
    console.error("[createKitchenOrderFromOrder] error:", err);
  }
}

router.get("/api/db/health", (req, res) => {
  try {
    res.json({
      ok: true,
      dbFile: paths.DB_FILE,
      dataDir: paths.DATA_DIR,
      backupDir: paths.BACKUP_DIR
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

router.post("/api/orders/save", (req, res) => {
  try {
    console.log("[POST /api/orders/save] HIT");
    console.log("[POST /api/orders/save] body:", JSON.stringify(req.body, null, 2));

    const order = saveOrder(req.body || {});
    createKitchenOrderFromOrder(order);

    console.log("[POST /api/orders/save] OK:", {
      orderId: order.id,
      totalCents: order.total_cents
    });

    res.json({
      ok: true,
      orderId: order.id,
      totalCents: order.total_cents
    });
  } catch (err) {
    console.error("[POST /api/orders/save] error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

router.get("/api/orders", (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const orders = listOrders(limit);
    res.json({
      ok: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error("[GET /api/orders] error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

router.get("/api/stats/summary", (req, res) => {
  try {
    const dateFrom = req.query.dateFrom || req.query.date_from || "";
    const dateTo = req.query.dateTo || req.query.date_to || "";
    const summary = getSummary(dateFrom, dateTo);
    res.json({
      ok: true,
      ...summary
    });
  } catch (err) {
    console.error("[GET /api/stats/summary] error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

router.get("/api/stats/detailed", (req, res) => {
  try {
    const dateFrom = req.query.dateFrom || req.query.date_from || "";
    const dateTo = req.query.dateTo || req.query.date_to || "";
    const dateSort = req.query.dateSort || req.query.date_sort || "desc";
    const stats = getDetailedStats(dateFrom, dateTo, dateSort);
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[GET /api/stats/detailed] error:", err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

router.post("/api/backup/create", (req, res) => {
  try {
    const file = createBackup();
    const keepDays = Number(req.body?.keepDays) || 7;
    pruneBackups(keepDays);
    res.json({
      ok: true,
      file
    });
  } catch (err) {
    console.error("[POST /api/backup/create] error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

// ── Counter endpoints ────────────────────────────────────

router.post("/api/counters/next/:type", (req, res) => {
  try {
    const type = req.params.type; // togo | service | drink
    if (!["togo", "service", "drink"].includes(type)) {
      return res.status(400).json({ ok: false, error: "Invalid counter type" });
    }
    const value = getNextCounter(type);
    res.json({ ok: true, type, value });
  } catch (err) {
    console.error("[POST /api/counters/next] error:", err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

router.post("/api/counters/reset/:type", (req, res) => {
  try {
    const type = req.params.type;
    if (!["togo", "service", "drink"].includes(type)) {
      return res.status(400).json({ ok: false, error: "Invalid counter type" });
    }
    resetCounter(type);
    res.json({ ok: true, type, value: 0 });
  } catch (err) {
    console.error("[POST /api/counters/reset] error:", err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

router.get("/api/counters", (req, res) => {
  try {
    res.json({
      ok: true,
      counters: {
        togo: getCounterValue("togo"),
        service: getCounterValue("service"),
        drink: getCounterValue("drink"),
      }
    });
  } catch (err) {
    console.error("[GET /api/counters] error:", err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;
