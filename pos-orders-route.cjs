const express = require("express");
const {
  saveOrder,
  listOrders,
  getSummary,
  getDetailedStats,
  createBackup,
  pruneBackups,
  paths
} = require("./pos-db.cjs");

const router = express.Router();


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

module.exports = router;
