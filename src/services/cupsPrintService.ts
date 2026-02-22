import { toast } from 'sonner';
import { Order, CartItem } from '@/store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────
export interface CupsPrinter {
  id: string;
  displayName: string;
  serverUrl: string;   // e.g. https://192.168.188.200:3443  (HTTPS proxy to CUPS relay)
  queueName: string;   // CUPS queue name
  isActive: boolean;
  assignedRoles: ('bar' | 'food' | 'combined')[];
}

// ─── Text sanitisation ───────────────────────────────────────────
export function sanitizeText(text: string): string {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\n\r]/g, '');
}

// ─── Bon builder ─────────────────────────────────────────────────
export type BonType = 'customer' | 'kitchen';

export function buildOrderBon(order: Order, bonType: BonType = 'customer'): string {
  const lines: string[] = [];
  const ts = new Date(order.timestamp);
  const dateStr = ts.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // ToGo number (prominent)
  if (order.serviceType === 'togo' && order.togoNumber !== undefined) {
    lines.push('================================');
    lines.push(`      TOGO-NR: ${order.togoNumber}`);
    lines.push('================================');
    lines.push('');
  }

  // Bon type label
  if (bonType === 'kitchen') {
    lines.push('*** KUECHENBON ***');
    lines.push('');
  }

  // Header
  lines.push(`Datum: ${dateStr}`);
  lines.push(`Zeit: ${timeStr}`);

  if (order.serviceType === 'service' && order.tableName) {
    lines.push(`Tisch: ${order.tableName}`);
  } else {
    lines.push('TO GO');
  }

  lines.push('');

  // Positions
  if (order.items.length > 0) {
    order.items.forEach((item: CartItem) => {
      const total = (item.product.price * item.quantity).toFixed(2);
      lines.push(`${item.quantity} x ${item.product.name} ${total} EUR`);
    });
  }

  // Deposit (only on customer bon)
  if (bonType === 'customer' && order.depositTotal !== 0) {
    lines.push('');
    lines.push(`Pfand: ${order.depositTotal.toFixed(2)} EUR`);
  }

  // Footer (only on customer bon)
  if (bonType === 'customer') {
    lines.push('');
    lines.push(`Gesamt: ${order.grandTotal.toFixed(2)} EUR`);
  }

  lines.push('');

  return sanitizeText(lines.join('\n'));
}

// ─── ESC/POS paper cut (appended as raw bytes) ───────────────────
// GS V 0  = full cut
const ESC_POS_CUT = '\x1D\x56\x00';

// ─── Send print job ──────────────────────────────────────────────
async function sendPrintJob(
  printer: CupsPrinter,
  text: string,
): Promise<boolean> {
  try {
    const payload = text + ESC_POS_CUT;

    await fetch(`${printer.serverUrl.replace(/\/+$/, '')}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer: printer.queueName,
        text: payload,
      }),
    });

    console.log(`[CupsPrint] Bon an "${printer.displayName}" (${printer.queueName}) gesendet`);
    return true;
  } catch (error) {
    console.error(`[CupsPrint] Fehler bei "${printer.displayName}":`, error);
    return false;
  }
}

// ─── Print to all assigned printers for a role ───────────────────
export async function printOrderForRole(
  order: Order,
  printers: CupsPrinter[],
  role: 'bar' | 'food' | 'combined',
  bonType: BonType = 'customer',
): Promise<void> {
  const text = buildOrderBon(order, bonType);

  const targets = printers.filter(
    (p) => p.isActive && p.assignedRoles.includes(role),
  );

  if (targets.length === 0) {
    console.warn('[CupsPrint] Keine aktiven Drucker fuer Rolle:', role);
    return;
  }

  const results = await Promise.all(
    targets.map((p) => sendPrintJob(p, text)),
  );

  const failed = results.filter((r) => !r).length;
  if (failed > 0) {
    toast.error('Druck fehlgeschlagen', {
      description: `${failed} von ${targets.length} Drucker(n) nicht erreichbar.`,
    });
  }
}

// ─── Print ToGo order to both customer and kitchen ───────────────
export async function printTogoOrder(
  order: Order,
  printers: CupsPrinter[],
  role: 'bar' | 'food' | 'combined',
): Promise<void> {
  // Customer bon → bar/combined printers (Kasse)
  await printOrderForRole(order, printers, role, 'customer');

  // Kitchen bon → food printers (Küche)
  const kitchenText = buildOrderBon(order, 'kitchen');
  const kitchenTargets = printers.filter(
    (p) => p.isActive && p.assignedRoles.includes('food'),
  );

  if (kitchenTargets.length === 0) {
    console.warn('[CupsPrint] Keine aktiven Kuechendrucker gefunden');
    return;
  }

  const results = await Promise.all(
    kitchenTargets.map((p) => sendPrintJob(p, kitchenText)),
  );

  const failed = results.filter((r) => !r).length;
  if (failed > 0) {
    toast.error('Kuechendruck fehlgeschlagen', {
      description: `${failed} von ${kitchenTargets.length} Kuechendrucker(n) nicht erreichbar.`,
    });
  }
}

// ─── Test print ──────────────────────────────────────────────────
export async function printTestPage(printer: CupsPrinter): Promise<boolean> {
  const now = new Date();
  const lines = [
    'TESTDRUCK',
    '',
    `Drucker: ${printer.displayName}`,
    `Queue: ${printer.queueName}`,
    `Datum: ${now.toLocaleDateString('de-DE')}`,
    `Zeit: ${now.toLocaleTimeString('de-DE')}`,
    '',
    'Zeichentest:',
    'AeOeUe aeoeue ss EUR',
    '0123456789',
    '',
    'Druck erfolgreich!',
    '',
  ];

  const text = sanitizeText(lines.join('\n'));
  return sendPrintJob(printer, text);
}

// ─── Health check ────────────────────────────────────────────────
export async function checkPrinterServer(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${serverUrl.replace(/\/+$/, '')}/health`,
      { method: 'GET', signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
