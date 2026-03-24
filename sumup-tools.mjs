import fs from "fs";
import path from "path";
import crypto from "crypto";
import process from "process";

const ENV_FILE = path.join(process.cwd(), ".env.sumup");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ENV-Datei nicht gefunden: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
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

  return env;
}

function saveEnvValue(filePath, key, value) {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = raw.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) updated.push(`${key}=${value}`);

  fs.writeFileSync(filePath, updated.join("\n").replace(/\n+$/, "\n"), "utf8");
}

function required(env, key) {
  const value = env[key];
  if (!value) throw new Error(`Fehlende ENV-Variable: ${key}`);
  return value;
}

async function sumupFetch(endpoint, { method = "GET", body, apiKey }) {
  const res = await fetch(`https://api.sumup.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/problem+json, application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `SumUp API Fehler ${res.status}: ${JSON.stringify(json, null, 2)}`
    );
  }

  return json;
}

function euroToMinorUnits(amount) {
  const normalized = String(amount).replace(",", ".").trim();
  const num = Number(normalized);

  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`Ungültiger Betrag: ${amount}`);
  }

  return Math.round(num * 100);
}

async function pairReader(pairingCode, readerName) {
  const env = loadEnv(ENV_FILE);
  const apiKey = required(env, "SUMUP_API_KEY");
  const merchantCode = required(env, "SUMUP_MERCHANT_CODE");

  const payload = {
    pairing_code: pairingCode,
    name: readerName,
  };

  const result = await sumupFetch(
    `/v0.1/merchants/${merchantCode}/readers`,
    {
      method: "POST",
      body: payload,
      apiKey,
    }
  );

  console.log("Reader erfolgreich angelegt:");
  console.log(JSON.stringify(result, null, 2));

  if (result?.id) {
    saveEnvValue(ENV_FILE, "SUMUP_READER_ID", result.id);
    console.log(`\nSUMUP_READER_ID wurde in .env.sumup gespeichert: ${result.id}`);
  }
}

async function listReaders() {
  const env = loadEnv(ENV_FILE);
  const apiKey = required(env, "SUMUP_API_KEY");
  const merchantCode = required(env, "SUMUP_MERCHANT_CODE");

  const result = await sumupFetch(
    `/v0.1/merchants/${merchantCode}/readers`,
    {
      method: "GET",
      apiKey,
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

async function getReaderStatus() {
  const env = loadEnv(ENV_FILE);
  const apiKey = required(env, "SUMUP_API_KEY");
  const merchantCode = required(env, "SUMUP_MERCHANT_CODE");
  const readerId = required(env, "SUMUP_READER_ID");

  const result = await sumupFetch(
    `/v0.1/merchants/${merchantCode}/readers/${readerId}/status`,
    {
      method: "GET",
      apiKey,
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

async function createCheckout(amount, description = "SeliCash Testzahlung") {
  const env = loadEnv(ENV_FILE);
  const apiKey = required(env, "SUMUP_API_KEY");
  const merchantCode = required(env, "SUMUP_MERCHANT_CODE");
  const readerId = required(env, "SUMUP_READER_ID");
  const affiliateKey = required(env, "SUMUP_AFFILIATE_KEY");
  const appId = required(env, "SUMUP_APP_ID");

  const foreignTransactionId = crypto.randomUUID();
  const minorValue = euroToMinorUnits(amount);

  const payload = {
    affiliate: {
      app_id: appId,
      key: affiliateKey,
      foreign_transaction_id: foreignTransactionId,
      tags: {
        source: "selicash",
      },
    },
    description,
    total_amount: {
      currency: "EUR",
      minor_unit: 2,
      value: minorValue,
    },
  };

  const result = await sumupFetch(
    `/v0.1/merchants/${merchantCode}/readers/${readerId}/checkout`,
    {
      method: "POST",
      body: payload,
      apiKey,
    }
  );

  console.log("Checkout erfolgreich gestartet:");
  console.log(JSON.stringify(result, null, 2));
}

async function terminateCheckout() {
  const env = loadEnv(ENV_FILE);
  const apiKey = required(env, "SUMUP_API_KEY");
  const merchantCode = required(env, "SUMUP_MERCHANT_CODE");
  const readerId = required(env, "SUMUP_READER_ID");

  const result = await sumupFetch(
    `/v0.1/merchants/${merchantCode}/readers/${readerId}/terminate`,
    {
      method: "POST",
      apiKey,
    }
  );

  console.log("Terminate gesendet:");
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    if (command === "pair") {
      const pairingCode = args[0];
      const readerName = args[1] || "SeliCash-Theke";
      if (!pairingCode) {
        throw new Error("Verwendung: node sumup-tools.mjs pair PAIRINGCODE [ReaderName]");
      }
      await pairReader(pairingCode, readerName);
      return;
    }

    if (command === "list-readers") {
      await listReaders();
      return;
    }

    if (command === "reader-status") {
      await getReaderStatus();
      return;
    }

    if (command === "checkout") {
      const amount = args[0];
      const description = args.slice(1).join(" ") || "SeliCash Testzahlung";
      if (!amount) {
        throw new Error("Verwendung: node sumup-tools.mjs checkout 1.00 [Beschreibung]");
      }
      await createCheckout(amount, description);
      return;
    }

    if (command === "terminate") {
      await terminateCheckout();
      return;
    }

    console.log(`
Verfügbare Befehle:

  node sumup-tools.mjs pair PAIRINGCODE [ReaderName]
  node sumup-tools.mjs list-readers
  node sumup-tools.mjs reader-status
  node sumup-tools.mjs checkout 1.00 [Beschreibung]
  node sumup-tools.mjs terminate
`);
  } catch (err) {
    console.error("\nFEHLER:");
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
