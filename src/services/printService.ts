import { toast } from 'sonner';
import type { LanPrinter, ReceiptPayload, ReceiptItem, ArchivedReceipt } from '@/types/printer';
import type { Order, CartItem, UserRole } from '@/store/useAppStore';

const API_BASE = 'http://192.168.188.200:3444/api';

// ─── HTTP helpers ────────────────────────────────────────────────
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Printer CRUD ────────────────────────────────────────────────
export async function fetchPrinters(): Promise<LanPrinter[]> {
  return api<LanPrinter[]>('/printers');
}

export async function savePrinter(printer: LanPrinter): Promise<LanPrinter> {
  return api<LanPrinter>('/printers', {
    method: printer.id ? 'PUT' : 'POST',
    body: JSON.stringify(printer),
  });
}

export async function deletePrinterApi(id: string): Promise<void> {
  await api(`/printers/${id}`, { method: 'DELETE' });
}

// ─── Text sanitisation ──────────────────────────────────────────
export function sanitizeForPrinter(text: string, printer: LanPrinter): string {
  let out = text;
  if (printer.transliterateGerman) {
    out = out
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss');
  }
  if (printer.replaceEuro) {
    out = out.replace(/€/g, 'EUR');
  }
  out = out.replace(/[^\x20-\x7E\n\r]/g, '');
  return out;
}

// ─── Bon text builder ────────────────────────────────────────────
function padLine(left: string, right: string, width: number): string {
  const gap = width - left.length - right.length;
  if (gap <= 0) return left + ' ' + right;
  return left + ' '.repeat(gap) + right;
}

function wrapName(name: string, maxLen: number): string[] {
  if (name.length <= maxLen) return [name];
  const lines: string[] = [];
  let remaining = name;
  while (remaining.length > maxLen) {
    let breakAt = remaining.lastIndexOf(' ', maxLen);
    if (breakAt <= 0) breakAt = maxLen;
    lines.push(remaining.substring(0, breakAt));
    remaining = remaining.substring(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

export function buildReceiptText(receipt: ReceiptPayload, printer: LanPrinter): string {
  const w = printer.charsPerLine;
  const lines: string[] = [];

  // Header
  const ts = new Date(receipt.timestamp);
  const dateStr = ts.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  lines.push(`Datum: ${dateStr}  Zeit: ${timeStr}`);

  // Role
  const roleLabel = receipt.role === 'bar' ? 'Bar' : receipt.role === 'food' ? 'Essen' : 'Komplett';
  lines.push(`Rolle: ${roleLabel}`);

  // Service type
  if (receipt.serviceType === 'SERVICE' && receipt.tableNumber) {
    lines.push(`Service - Tisch: ${receipt.tableNumber}`);
  } else if (receipt.serviceType === 'TOGO') {
    if (receipt.togoNumber !== undefined) {
      lines.push('='.repeat(w));
      lines.push(`      TOGO-NR: ${receipt.togoNumber}`);
      lines.push('='.repeat(w));
    } else {
      lines.push('TO GO');
    }
  }

  lines.push('-'.repeat(w));

  // Items
  receipt.items.forEach((item) => {
    const priceStr = `${item.lineTotal.toFixed(2).replace('.', ',')} EUR`;
    const prefix = `${item.qty}x `;
    const maxNameLen = w - prefix.length - priceStr.length - 1;

    if (maxNameLen > 0 && item.name.length <= maxNameLen) {
      lines.push(padLine(`${prefix}${item.name}`, priceStr, w));
    } else {
      // Wrap: first line has qty prefix, subsequent lines indented
      const nameLines = wrapName(item.name, Math.max(w - prefix.length - 1, 10));
      nameLines.forEach((nl, idx) => {
        if (idx === 0) {
          lines.push(padLine(`${prefix}${nl}`, priceStr, w));
        } else {
          lines.push('  ' + nl);
        }
      });
    }
  });

  lines.push('-'.repeat(w));

  // Total
  lines.push(padLine('Gesamt:', `${receipt.totals.grandTotal.toFixed(2).replace('.', ',')} EUR`, w));

  // Payment
  lines.push('');
  if (receipt.payment.deferred) {
    lines.push('Bezahlung erfolgt am Tisch');
  } else {
    lines.push(`Bezahlart: ${receipt.payment.method === 'CASH' ? 'Bar' : 'Karte'}`);
    if (receipt.payment.method === 'CASH') {
      if (receipt.payment.receivedAmount !== undefined) {
        lines.push(`Erhalten: ${receipt.payment.receivedAmount.toFixed(2).replace('.', ',')} EUR`);
      }
      if (receipt.payment.changeAmount !== undefined) {
        lines.push(`Rueckgeld: ${receipt.payment.changeAmount.toFixed(2).replace('.', ',')} EUR`);
      }
    }
  }

  lines.push('');

  return sanitizeForPrinter(lines.join('\n'), printer);
}

// ─── Build receipt payload from order ────────────────────────────
export function buildReceiptPayload(order: Order): ReceiptPayload {
  return {
    id: order.id,
    timestamp: new Date(order.timestamp).toISOString(),
    role: order.role || 'combined',
    serviceType: order.serviceType === 'togo' ? 'TOGO' : 'SERVICE',
    tableNumber: order.tableName || undefined,
    togoNumber: order.togoNumber,
    items: order.items.map((item: CartItem): ReceiptItem => ({
      qty: item.quantity,
      name: item.product.name,
      unitPrice: item.product.price,
      lineTotal: item.product.price * item.quantity,
    })),
    totals: { grandTotal: order.grandTotal },
    payment: {
      method: order.paymentMethod === 'cash' ? 'CASH' : 'CARD',
      receivedAmount: order.amountPaid,
      changeAmount: order.change,
      deferred: !order.isPaid,
    },
  };
}

// ─── Send print job to backend ───────────────────────────────────
export async function sendPrintJob(
  printer: LanPrinter,
  receipt: ReceiptPayload,
): Promise<boolean> {
  try {
    const text = buildReceiptText(receipt, printer);
    await fetch(`${API_BASE}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cupsQueue: printer.cupsQueue,
        text,
        cut: printer.cutAfterPrint,
      }),
    });
    console.log(`[Print] Bon an "${printer.displayName}" (${printer.cupsQueue}) gesendet`);
    return true;
  } catch (error) {
    console.error(`[Print] Fehler bei "${printer.displayName}":`, error);
    return false;
  }
}

// ─── Print order to all matching printers ────────────────────────
export async function printOrderToMatchingPrinters(
  order: Order,
  printers: LanPrinter[],
  role: 'bar' | 'food' | 'combined',
): Promise<{ failed: string[] }> {
  const receipt = buildReceiptPayload(order);

  const targets = printers.filter(
    (p) => p.enabled && p.assignedRoles.includes(role),
  );

  if (targets.length === 0) {
    console.warn('[Print] Keine aktiven Drucker fuer Rolle:', role);
    return { failed: [] };
  }

  const results = await Promise.all(
    targets.map(async (p) => ({ printer: p, ok: await sendPrintJob(p, receipt) })),
  );

  const failed = results.filter((r) => !r.ok).map((r) => r.printer.displayName);
  return { failed };
}

// ─── Test print ──────────────────────────────────────────────────
export async function sendTestPrint(printer: LanPrinter): Promise<boolean> {
  const now = new Date();
  const w = printer.charsPerLine;
  const lines = [
    '='.repeat(w),
    padLine('', 'TESTDRUCK', w),
    '='.repeat(w),
    '',
    `Drucker: ${printer.displayName}`,
    `Queue:   ${printer.cupsQueue}`,
    `Datum:   ${now.toLocaleDateString('de-DE')}`,
    `Zeit:    ${now.toLocaleTimeString('de-DE')}`,
    '',
    'Zeichentest:',
    'AeOeUe aeoeue ss EUR',
    '0123456789',
    '-'.repeat(w),
    'Druck erfolgreich!',
    '',
  ];
  const text = sanitizeForPrinter(lines.join('\n'), printer);
  try {
    await fetch(`${API_BASE}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cupsQueue: printer.cupsQueue, text, cut: printer.cutAfterPrint }),
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Receipt Archive API ─────────────────────────────────────────
export async function fetchReceipts(filters?: Record<string, string>): Promise<ArchivedReceipt[]> {
  const params = new URLSearchParams(filters);
  return api<ArchivedReceipt[]>(`/receipts?${params.toString()}`);
}

export async function deleteAllReceipts(): Promise<void> {
  await api('/receipts', { method: 'DELETE' });
}

export async function reprintReceipt(id: string): Promise<void> {
  await api(`/receipts/${id}/reprint`, { method: 'POST' });
}

// ─── Archive toggle ──────────────────────────────────────────────
export async function getArchiveEnabled(): Promise<boolean> {
  try {
    const data = await api<{ enabled: boolean }>('/receipts/settings');
    return data.enabled;
  } catch {
    return false;
  }
}

export async function setArchiveEnabled(enabled: boolean): Promise<void> {
  await api('/receipts/settings', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}
