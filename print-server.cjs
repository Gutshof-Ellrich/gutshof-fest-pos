// ~/gutshof-fest-pos/print-server.cjs

const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sumupStatusRoute = require("./sumup-status-route.cjs");
const posOrdersRoute = require("./pos-orders-route.cjs");
const cors = require("cors");

function cryptoRandomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
}));


app.use(express.json({ limit: "500kb" }));
app.use(posOrdersRoute);

// ----
// SUMUP
// ------

const SUMUP_ENV_FILE = path.join(__dirname, ".env.sumup");

function loadSumupEnv() {
  if (!fs.existsSync(SUMUP_ENV_FILE)) {
    throw new Error(".env.sumup nicht gefunden");
  }

  const raw = fs.readFileSync(SUMUP_ENV_FILE, "utf8");
  const env = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }

  const requiredKeys = [
    "SUMUP_API_KEY",
    "SUMUP_AFFILIATE_KEY",
    "SUMUP_APP_ID",
    "SUMUP_MERCHANT_CODE",
    "SUMUP_READER_ID_FOOD",
    "SUMUP_READER_ID_BAR",
  ];

  for (const key of requiredKeys) {
    if (!env[key]) {
      throw new Error(`Fehlende ENV-Variable: ${key}`);
    }
  }

  return env;
}

function euroToMinorUnits(amount) {
  const normalized = String(amount).replace(",", ".").trim();
  const num = Number(normalized);

  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`Ungültiger Betrag: ${amount}`);
  }

  return Math.round(num * 100);
}

async function sumupFetch(endpoint, { method = "GET", body, apiKey }) {
  const res = await fetch(`https://api.sumup.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, application/problem+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`SumUp API Fehler ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}


// ------------------------------------------------------------
// CORS (Safari / iPad / LAN)
// ------------------------------------------------------------
// app.use((req, res, next) => {
//  const origin = req.headers.origin;

//  if (origin) {
//    res.header("Access-Control-Allow-Origin", origin);
//    res.header("Vary", "Origin");
//  } else {
//    res.header("Access-Control-Allow-Origin", "*");
//  }

//  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
//  res.header(
//    "Access-Control-Allow-Headers",
//    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
//  );
//  res.header("Access-Control-Max-Age", "86400");

  // wichtig für moderne Browser bei Requests ins lokale/private Netz
//  if (req.headers["access-control-request-private-network"] === "true") {
//    res.header("Access-Control-Allow-Private-Network", "true");
//  }

//  if (req.method === "OPTIONS") {
//    console.log("[CORS PREFLIGHT]", req.originalUrl, req.headers);
//    return res.sendStatus(204);
//  }

//  next();
// });

app.use(sumupStatusRoute);

// ------------------------------------------------------------
// Files (persist simple JSON in project folder)
// ------------------------------------------------------------
const PRINTERS_FILE = path.join(__dirname, "printers.json");
const ARCHIVE_FILE = path.join(__dirname, "receipt-archive.json");
const MASTERDATA_FILE = path.join(__dirname, "masterdata.json");

// ------------------------------------------------------------
// Helpers: storage
// ------------------------------------------------------------
function loadPrinters() {
  try {
    const list = JSON.parse(fs.readFileSync(PRINTERS_FILE, "utf8"));
    return (list || []).map(normalizePrinter);
  } catch {
    return [];
  }
}

function savePrinters(list) {
  fs.writeFileSync(PRINTERS_FILE, JSON.stringify(list, null, 2), "utf8");
}

function normalizePrinter(input) {
  const p = input && typeof input === "object" ? { ...input } : {};

  // tolerate alternate field names from frontend
  p.displayName =
    p.displayName ||
    p.name ||
    p.printerName ||
    p.title ||
    p.label ||
    "";

  p.cupsQueue =
    p.cupsQueue ||
    p.queue ||
    p.queueName ||
    p.cups ||
    p.printer ||
    "";

  // defaults so frontend doesn't crash
  p.enabled = p.enabled ?? true;
  p.assignedRoles = Array.isArray(p.assignedRoles) ? p.assignedRoles : ["Komplett"];

  // 80mm paper (79mm): MEDIUM (Font A / normal size)
  p.fontMode = p.fontMode || "NORMAL";
  p.charsPerLine = Number.isFinite(p.charsPerLine) ? p.charsPerLine : 48;

  // extra feed before cut so last lines are not cut off
  p.feedBeforeCut = Number.isFinite(p.feedBeforeCut) ? p.feedBeforeCut : 8;

  p.codePage = p.codePage || "PC858";
  p.replaceEuro = p.replaceEuro ?? true;
  p.transliterateGerman = p.transliterateGerman ?? true;
  p.cutAfterPrint = p.cutAfterPrint ?? true;
  p.protocol = p.protocol || "ESC_POS";

  return p;
}

function loadArchive() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf8"));
  } catch {
    return { enabled: false, receipts: [] };
  }
}

function saveArchive(data) {
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ------------------------------------------------------------
// Helpers: text sanitize (umlauts + euro)
// ------------------------------------------------------------
function transliterateGerman(s) {
  return s
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function applyTextTransforms(text, opts) {
  let t = String(text || "").replace(/\r\n/g, "\n");
  if (opts?.replaceEuro) t = t.replace(/€/g, "EUR");
  if (opts?.transliterateGerman) t = transliterateGerman(t);
  return t;
}

// ------------------------------------------------------------
// ESC/POS helpers
// ------------------------------------------------------------
function escposPreamble(opts) {
  const chunks = [];
  chunks.push(Buffer.from([0x1b, 0x40])); // ESC @ init

  if (opts?.codePage === "PC858") {
    chunks.push(Buffer.from([0x1b, 0x74, 0x13])); // ESC t 19 (PC858)
  }

  // Font A (normal)
  chunks.push(Buffer.from([0x1b, 0x4d, 0x00])); // ESC M 0
  // Normal size
  chunks.push(Buffer.from([0x1d, 0x21, 0x10])); // GS ! 0x00

  return Buffer.concat(chunks);
}

function escposFeed(lines) {
  const n = Math.max(0, Math.min(255, Number(lines) || 0));
  if (n <= 0) return Buffer.alloc(0);
  return Buffer.from([0x1b, 0x64, n]); // ESC d n
}

function escposCut(enabled) {
  if (enabled === false) return Buffer.alloc(0);
  return Buffer.from([0x1d, 0x56, 0x31]); // GS V 1
}

// Prevent wrap: hard-cut each line to charsPerLine
function enforceNoWrap(text, charsPerLine) {
  const n = Math.max(10, Number(charsPerLine) || 48);
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.length > n ? line.slice(0, n) : line))
    .join("\n");
}

// ------------------------------------------------------------
// Health
// ------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ------------------------------------------------------------
// Printers CRUD
// ------------------------------------------------------------
app.get("/printers", (_req, res) => res.json(loadPrinters()));
app.get("/api/printers", (_req, res) => res.json(loadPrinters()));

function requireCreateFields(p, res) {
  const dn = (p.displayName || "").trim();
  const cq = (p.cupsQueue || "").trim();
  if (!dn || !cq) {
    res.status(400).json({ error: "displayName/name and cupsQueue/queue required" });
    return false;
  }
  p.displayName = dn;
  p.cupsQueue = cq;
  return true;
}

// POST = create
app.post(["/printers", "/api/printers"], (req, res) => {
  const list = loadPrinters();
  const body = req.body?.printer ?? req.body; // tolerate {printer:{...}}
  const p = normalizePrinter(body);

  if (!requireCreateFields(p, res)) return;

  p.id = p.id || cryptoRandomId();
  list.push(p);
  savePrinters(list);
  res.status(201).json(p);
});

// PUT = update OR create (UPSERT) OR bulk replace
app.put(["/printers", "/api/printers"], (req, res) => {
  const body = req.body?.printers ?? req.body;

  // Bulk save: array replaces full list
  if (Array.isArray(body)) {
    const next = body.map((x) => {
      const p = normalizePrinter(x);
      p.id = p.id || cryptoRandomId();
      return p;
    });
    savePrinters(next);
    return res.json(next);
  }

  // Single object: upsert
  const list = loadPrinters();
  const p = normalizePrinter(body);

  // If no id -> treat as create
  if (!p.id) {
    if (!requireCreateFields(p, res)) return;
    p.id = cryptoRandomId();
    list.push(p);
    savePrinters(list);
    return res.status(201).json(p);
  }

  const idx = list.findIndex((x) => x.id === p.id);
  if (idx === -1) {
    if (!requireCreateFields(p, res)) return;
    list.push(p);
    savePrinters(list);
    return res.status(201).json(p);
  }

  list[idx] = { ...list[idx], ...p };
  savePrinters(list);
  res.json(list[idx]);
});

app.delete(["/printers/:id", "/api/printers/:id"], (req, res) => {
  const list = loadPrinters();
  const next = list.filter((p) => p.id !== req.params.id);
  savePrinters(next);
  res.json({ success: true });
});

// ------------------------------------------------------------
// Archive / Receipts
// ------------------------------------------------------------
app.get(["/archive", "/api/receipts"], (_req, res) => {
  const data = loadArchive();
  res.json({
    enabled: !!data.enabled,
    count: (data.receipts || []).length,
    receipts: data.receipts || [],
  });
});

app.post(["/archive/toggle", "/api/archive/toggle"], (req, res) => {
  const enabled = !!req.body?.enabled;
  const data = loadArchive();
  data.enabled = enabled;
  saveArchive(data);
  res.json({ enabled });
});

app.delete(["/archive", "/api/archive"], (_req, res) => {
  const current = loadArchive();
  saveArchive({ enabled: !!current.enabled, receipts: [] });
  res.json({ success: true });
});

// ------------------------------------------------------------
// Print logic
// ------------------------------------------------------------
function handlePrint(job, res) {
  const printer = job?.printer || job?.cupsQueue;
  const text = job?.text;
  const options = job?.options || {};
  const meta = job?.meta || {};

  if (typeof printer !== "string" || !printer.trim()) {
    return res.status(400).json({ error: "No printer provided (printer/cupsQueue)" });
  }
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "No text provided" });
  }

  const cutAfterPrint =
    typeof job?.cut === "boolean" ? job.cut : options.cutAfterPrint !== false;

  const cleanText = applyTextTransforms(text, {
    replaceEuro: options.replaceEuro !== false,
    transliterateGerman: options.transliterateGerman !== false,
  });

  const charsPerLine = options.charsPerLine || 48;
  const finalText = enforceNoWrap(cleanText, charsPerLine);

  const feedBeforeCut =
    Number.isFinite(options.feedBeforeCut) ? options.feedBeforeCut : 8;

  const payload = Buffer.concat([
    escposPreamble({
      codePage: options.codePage || "PC858",
    }),
    Buffer.from(finalText.replace(/\r\n/g, "\n") + "\n", "utf8"),
    escposFeed(feedBeforeCut),
    escposCut(cutAfterPrint),
  ]);

  const lp = spawn("lp", ["-d", printer, "-o", "raw"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let err = "";
  lp.stderr.on("data", (d) => (err += d.toString()));

  lp.on("close", (code) => {
    if (code === 0) {
      const data = loadArchive();
      if (data.enabled) {
        data.receipts.unshift({
          id: cryptoRandomId(),
          timestamp: new Date().toISOString(),
          printer,
          text: finalText,
          meta,
        });
        data.receipts = data.receipts.slice(0, 5000);
        saveArchive(data);
      }
      return res.json({ success: true });
    }

    console.error("lp failed:", err);
    return res.status(500).json({ error: "Print failed", details: err.trim() });
  });

  lp.stdin.write(payload);
  lp.stdin.end();
}

app.post(["/print", "/api/print"], (req, res) => handlePrint(req.body || {}, res));

app.post("/api/receipts/:id/reprint", (req, res) => {
  const data = loadArchive();
  const r = (data.receipts || []).find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: "receipt not found" });

  const printer = req.body?.printer || req.body?.cupsQueue || r.printer;
  if (!printer) return res.status(400).json({ error: "No printer available for reprint" });

  const job = {
    cupsQueue: printer,
    text: r.text,
    cut: typeof req.body?.cut === "boolean" ? req.body.cut : true,
    options: req.body?.options || {},
    meta: r.meta || {},
  };

  return handlePrint(job, res);
});


// -------------------
// SumUp
// -------------------
app.post("/api/payments/sumup/start", async (req, res) => {
  try {
    const { amount, description, orderId, deviceKey } = req.body || {};

    if (!amount) {
      return res.status(400).json({ ok: false, error: "amount fehlt" });
    }

    const env = loadSumupEnv();

    let readerId;
    if (deviceKey === "solo-bar") {
      readerId = env.SUMUP_READER_ID_BAR;
    } else {
      readerId = env.SUMUP_READER_ID_FOOD;
    }

    if (!readerId) {
      return res.status(500).json({
        ok: false,
        error: "Keine passende SUMUP Reader-ID konfiguriert",
      });
    }

    console.log("[SUMUP START]", {
      amount,
      orderId,
      deviceKey,
      readerId,
    });

    const payload = {
      affiliate: {
        app_id: env.SUMUP_APP_ID,
        key: env.SUMUP_AFFILIATE_KEY,
        foreign_transaction_id: orderId || crypto.randomUUID(),
        tags: {
          source: "selicash",
          deviceKey: deviceKey || "solo-food",
        },
      },
      description: description || "SeliCash Kartenzahlung",
      total_amount: {
        currency: "EUR",
        minor_unit: 2,
        value: euroToMinorUnits(amount),
      },
    };

    const result = await sumupFetch(
      `/v0.1/merchants/${env.SUMUP_MERCHANT_CODE}/readers/${readerId}/checkout`,
      {
        method: "POST",
        body: payload,
        apiKey: env.SUMUP_API_KEY,
      }
    );

    return res.json({
      ok: true,
      clientTransactionId:
        result?.data?.client_transaction_id ||
        result?.client_transaction_id ||
        null,
      orderId,
      sumup: result,
    });
  } catch (err) {
    console.error("SUMUP START ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "SumUp Fehler",
    });
  }
});



// ------------------------------------------------------------
// Master Data (central JSON store)
// ------------------------------------------------------------
function loadMasterData() {
  try {
    return JSON.parse(fs.readFileSync(MASTERDATA_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveMasterDataFile(data) {
  fs.writeFileSync(MASTERDATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/masterdata", (_req, res) => {
  const data = loadMasterData();
  if (!data) {
    return res.status(404).json({ error: "Keine Stammdaten vorhanden" });
  }
  res.json(data);
});

app.put("/api/masterdata", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Ungueltige Daten" });
  }

  const data = {
    categories: body.categories || [],
    products: body.products || [],
    tables: body.tables || [],
    depositPerGlass: body.depositPerGlass ?? 2,
    adminPin: body.adminPin || "1234",
    backgroundImage: body.backgroundImage ?? null,
    updatedAt: new Date().toISOString(),
  };

  saveMasterDataFile(data);
  res.json(data);
});

// ------------------------------------------------------------
// Start
// ------------------------------------------------------------
app.listen(3444, "0.0.0.0", () => {
  console.log("Print server running on port 3444");
});
