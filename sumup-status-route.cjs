const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const SUMUP_ENV_FILE = path.join(__dirname, ".env.sumup");
const SUMUP_API_BASE = "https://api.sumup.com";
const FETCH_TIMEOUT_MS = 8000;

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
    "SUMUP_MERCHANT_CODE",
    "SUMUP_READER_ID",
  ];

  for (const key of requiredKeys) {
    if (!env[key]) {
      throw new Error(`Fehlende ENV-Variable: ${key}`);
    }
  }

  return env;
}

async function sumupFetch(endpoint, { method = "GET", body, apiKey }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${SUMUP_API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, application/problem+json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(
        `SumUp API Fehler ${res.status}: ${JSON.stringify(data)}`
      );
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`SumUp API Timeout nach ${FETCH_TIMEOUT_MS} ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchReaderStatus(env, merchantCode, readerId) {
  const json = await sumupFetch(
    `/v0.1/merchants/${encodeURIComponent(
      merchantCode
    )}/readers/${encodeURIComponent(readerId)}/status`,
    {
      method: "GET",
      apiKey: env.SUMUP_API_KEY,
    }
  );

  return json?.data || null;
}


async function fetchTransactionByForeignTransactionId(env, orderId) {
  const json = await sumupFetch(
    `/v0.1/me/transactions?foreign_transaction_id=${encodeURIComponent(
      orderId
    )}&limit=1&order=descending`,
    {
      method: "GET",
      apiKey: env.SUMUP_API_KEY,
    }
  );


   if (Array.isArray(json?.items)) {
     return json.items.length > 0 ? json.items[0] : null;
   }

   if (Array.isArray(json?.data)) {
    return json.data.length > 0 ? json.data[0] : null;
   }

   if (json && typeof json === "object" && json.status) {
    return json;
   }

   return null;
   }


function mapUiState({ txStatus, readerStatus, readerState }) {
  if (txStatus === "SUCCESSFUL") {
    return {
      phase: "success",
      label: "Kartenzahlung erfolgreich",
      canMarkPaid: true,
      final: true,
    };
  }

  if (txStatus === "CANCELLED") {
    return {
      phase: "cancelled",
      label: "Kartenzahlung abgebrochen",
      canMarkPaid: false,
      final: true,
    };
  }

  if (txStatus === "FAILED") {
    return {
      phase: "failed",
      label: "Kartenzahlung fehlgeschlagen",
      canMarkPaid: false,
      final: true,
    };
  }

  if (readerStatus === "OFFLINE") {
    return {
      phase: "reader_offline",
      label: "Solo ist offline",
      canMarkPaid: false,
      final: false,
    };
  }

  switch (readerState) {
    case "WAITING_FOR_CARD":
      return {
        phase: "waiting_for_card",
        label: "Warte auf Karte",
        canMarkPaid: false,
        final: false,
      };

    case "WAITING_FOR_PIN":
      return {
        phase: "waiting_for_pin",
        label: "PIN-Eingabe läuft",
        canMarkPaid: false,
        final: false,
      };

    case "WAITING_FOR_SIGNATURE":
      return {
        phase: "waiting_for_signature",
        label: "Warte auf Unterschrift",
        canMarkPaid: false,
        final: false,
      };

    case "SELECTING_TIP":
      return {
        phase: "selecting_tip",
        label: "Trinkgeld-Auswahl am Terminal",
        canMarkPaid: false,
        final: false,
      };

    case "IDLE":
      return {
        phase: "pending",
        label: "Kartenzahlung wird verarbeitet",
        canMarkPaid: false,
        final: false,
      };

    default:
      return {
        phase: "pending",
        label: "Kartenzahlung wird verarbeitet",
        canMarkPaid: false,
        final: false,
      };
  }
}

router.get("/api/sumup/checkout-status", async (req, res) => {
  try {
    const env = loadSumupEnv();

    const orderId = String(
     req.query.orderId ||
      req.query.order_id ||
      req.query.clientTransactionId ||
      req.query.client_transaction_id ||
     ""
    ).trim();

    const merchantCode = String(
      req.query.merchantCode || env.SUMUP_MERCHANT_CODE || ""
    ).trim();

    const readerId = String(
      req.query.readerId || env.SUMUP_READER_ID || ""
    ).trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "orderId fehlt",
     });
    }

    const [reader, tx] = await Promise.allSettled([
     fetchReaderStatus(env, merchantCode, readerId),
     fetchTransactionByForeignTransactionId(env, orderId),
    ]);

    if (reader.status === "rejected" && tx.status === "rejected") {
      return res.status(502).json({
        ok: false,
        error: "Reader- und Transaktionsstatus konnten nicht abgefragt werden",
        diagnostics: {
          transactionLookupOk: false,
          readerLookupOk: false,
          transactionLookupError: String(tx.reason?.message || tx.reason),
          readerLookupError: String(reader.reason?.message || reader.reason),
        },
      });
    }

    const readerData = reader.status === "fulfilled" ? reader.value : null;
    const txData = tx.status === "fulfilled" ? tx.value : null;

    const readerStatus = readerData?.status || null;
    const readerState = readerData?.state || null;
    const txStatus = txData?.status || "PENDING";

    const ui = mapUiState({
      txStatus,
      readerStatus,
      readerState,
    });


    return res.json({
      ok: true,
      clientTransactionId: orderId,
      orderId,
      transaction: txData
        ? {
            id: txData.id || null,
            status: txData.status || null,
            amount: txData.amount ?? null,
            currency: txData.currency || null,
            timestamp: txData.timestamp || null,
            payment_type: txData.payment_type || null,
            card_type: txData.card_type || null,
            entry_mode: txData.entry_mode || null,
            transaction_code: txData.transaction_code || null,
          }
        : null,
      reader: readerData
        ? {
            status: readerData.status || null,
            state: readerData.state || null,
            connection_type: readerData.connection_type || null,
            battery_level: readerData.battery_level ?? null,
            firmware_version: readerData.firmware_version || null,
            last_activity: readerData.last_activity || null,
          }
        : null,
      ui,
      diagnostics: {
        transactionLookupOk: tx.status === "fulfilled",
        readerLookupOk: reader.status === "fulfilled",
        transactionLookupError:
          tx.status === "rejected"
            ? String(tx.reason?.message || tx.reason)
            : null,
        readerLookupError:
          reader.status === "rejected"
            ? String(reader.reason?.message || reader.reason)
            : null,
      },
    });
  } catch (err) {
    console.error("[GET /api/sumup/checkout-status] error:", err);

    return res.status(500).json({
      ok: false,
      error: err.message || "Unbekannter Fehler",
    });
  }
});

module.exports = router;
