import { toast } from 'sonner';
import { Order, CartItem, DepositInfo } from '@/store/useAppStore';

// Print server configuration
// Default: HTTPS proxy (Caddy) that forwards to http://192.168.188.200:3001
let PRINT_SERVER_URL = 'https://192.168.188.200:3443';
const PRINTER_NAME = 'kueche';
const RECEIPT_WIDTH = 48;

/**
 * Configure the print server URL at runtime.
 * Called from the store on app init to restore the persisted URL.
 */
export function configurePrintServer(url: string) {
  PRINT_SERVER_URL = url.replace(/\/+$/, ''); // strip trailing slashes
  console.log('[PrintService] Server-URL konfiguriert:', PRINT_SERVER_URL);
}

/**
 * Sanitize text: replace umlauts, special chars with ASCII equivalents.
 * Ensures compatibility with thermal printers via the print server.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/ae/g, 'ae') // already safe, no-op
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/€/g, 'EUR')
    // Remove any remaining non-ASCII characters
    .replace(/[^\x20-\x7E\n\r]/g, '');
}

/**
 * Format currency without special characters
 */
function formatCurrency(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`;
}

/**
 * Create a separator line
 */
function separator(char = '-'): string {
  return char.repeat(RECEIPT_WIDTH);
}

/**
 * Format a line with left-aligned and right-aligned text
 */
function formatLine(left: string, right: string): string {
  const spaces = RECEIPT_WIDTH - left.length - right.length;
  if (spaces <= 0) {
    return left.substring(0, RECEIPT_WIDTH - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(spaces) + right;
}

/**
 * Center text within receipt width
 */
function centerText(text: string): string {
  const padding = Math.floor((RECEIPT_WIDTH - text.length) / 2);
  if (padding <= 0) return text;
  return ' '.repeat(padding) + text;
}

/**
 * Build a plain-text receipt for an order
 */
export function buildReceiptText(order: Order): string {
  const lines: string[] = [];
  const timestamp = new Date(order.timestamp);
  const dateStr = timestamp.toLocaleDateString('de-DE');
  const timeStr = timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // Header
  lines.push(centerText('Gutshof Ellrich'));
  lines.push(centerText('Weinfest 2025'));
  lines.push('');

  // Service type
  if (order.serviceType === 'service') {
    const tableInfo = order.tableName ? ` - Tisch ${order.tableName}` : '';
    lines.push(centerText(`SERVICE${tableInfo}`));
  } else {
    lines.push(centerText('TO GO'));
  }
  lines.push('');

  // Date / Time
  lines.push(separator());
  lines.push(formatLine('Datum:', dateStr));
  lines.push(formatLine('Uhrzeit:', timeStr));
  lines.push(separator());

  // Items
  if (order.items.length > 0) {
    order.items.forEach((item) => {
      const qty = `${item.quantity}x `;
      const priceStr = formatCurrency(item.product.price * item.quantity);
      const nameWidth = RECEIPT_WIDTH - qty.length - priceStr.length - 1;
      const name = item.product.name.length > nameWidth
        ? item.product.name.substring(0, nameWidth - 2) + '..'
        : item.product.name;
      lines.push(formatLine(qty + name, priceStr));
    });
  }

  // Deposit section
  const depositSaldo = (order.deposit.newDeposits - order.deposit.returnedDeposits) * order.deposit.depositValue;
  if (order.deposit.newDeposits > 0 || order.deposit.returnedDeposits > 0) {
    lines.push(separator());
    lines.push('Pfand:');
    if (order.deposit.newDeposits > 0) {
      lines.push(formatLine(
        `  Neu: ${order.deposit.newDeposits} Glaeser`,
        formatCurrency(order.deposit.newDeposits * order.deposit.depositValue)
      ));
    }
    if (order.deposit.returnedDeposits > 0) {
      lines.push(formatLine(
        `  Zurueck: ${order.deposit.returnedDeposits} Glaeser`,
        `-${formatCurrency(order.deposit.returnedDeposits * order.deposit.depositValue)}`
      ));
    }
    lines.push(formatLine('  Pfand-Saldo:', formatCurrency(depositSaldo)));
  }

  // Totals
  lines.push(separator('='));
  lines.push(formatLine('Summe Artikel:', formatCurrency(order.total)));
  if (order.depositTotal !== 0) {
    lines.push(formatLine('Pfand:', formatCurrency(order.depositTotal)));
  }
  lines.push(formatLine('GESAMT:', formatCurrency(order.grandTotal)));
  lines.push(separator('='));

  // Payment info
  lines.push(formatLine('Zahlungsart:', order.paymentMethod === 'cash' ? 'Bar' : 'Karte'));
  if (order.paymentMethod === 'cash' && order.amountPaid) {
    lines.push(formatLine('Gegeben:', formatCurrency(order.amountPaid)));
    lines.push(formatLine('Rueckgeld:', formatCurrency(order.change || 0)));
  }

  // Footer
  lines.push('');
  lines.push(centerText('Vielen Dank!'));
  lines.push(centerText('Wir freuen uns auf Ihren'));
  lines.push(centerText('naechsten Besuch!'));
  lines.push('');

  // Sanitize the entire text
  return sanitizeText(lines.join('\n'));
}

/**
 * Build a test receipt
 */
export function buildTestReceipt(): string {
  const now = new Date();
  const lines: string[] = [];

  lines.push(centerText('TESTDRUCK'));
  lines.push('');
  lines.push(centerText('Gutshof Ellrich - Weinfest'));
  lines.push(separator());
  lines.push(formatLine('Drucker:', PRINTER_NAME));
  lines.push(formatLine('Datum:', now.toLocaleDateString('de-DE')));
  lines.push(formatLine('Zeit:', now.toLocaleTimeString('de-DE')));
  lines.push(separator());
  lines.push('Zeichentest:');
  lines.push('AeOeUe aeoeue ss EUR @ # &');
  lines.push('0123456789');
  lines.push(separator());
  lines.push(centerText('Druck erfolgreich!'));
  lines.push('');

  return sanitizeText(lines.join('\n'));
}

/**
 * Build daily summary receipt
 */
export function buildDailySummary(orders: Order[]): string {
  const lines: string[] = [];
  const date = new Date();

  const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const cashOrders = orders.filter(o => o.paymentMethod === 'cash');
  const cardOrders = orders.filter(o => o.paymentMethod === 'card');
  const cashTotal = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const depositTotal = orders.reduce((sum, o) => sum + o.depositTotal, 0);

  lines.push(centerText('TAGESABSCHLUSS'));
  lines.push('');
  lines.push(centerText('Gutshof Ellrich - Weinfest'));
  lines.push(centerText(date.toLocaleDateString('de-DE')));
  lines.push(separator('='));

  lines.push('UEBERSICHT');
  lines.push(formatLine('Anzahl Bestellungen:', orders.length.toString()));
  lines.push(formatLine('Gesamtumsatz:', formatCurrency(totalRevenue)));
  lines.push(separator());

  lines.push('ZAHLUNGSARTEN');
  lines.push(formatLine(`Bar (${cashOrders.length}x):`, formatCurrency(cashTotal)));
  lines.push(formatLine(`Karte (${cardOrders.length}x):`, formatCurrency(cardTotal)));
  lines.push(separator());

  lines.push('PFAND');
  lines.push(formatLine('Pfand-Saldo:', formatCurrency(depositTotal)));
  lines.push(separator('='));
  lines.push('');

  return sanitizeText(lines.join('\n'));
}

/**
 * Send text to the print server
 */
export async function printReceipt(text: string): Promise<boolean> {
  try {
    await fetch(`${PRINT_SERVER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer: PRINTER_NAME,
        text: text,
      }),
    });

    // Druck gilt als erfolgreich wenn der Request ohne Netzwerkfehler gesendet wurde
    console.log('[PrintService] Bon erfolgreich gesendet');
    return true;
  } catch (error) {
    console.error('[PrintService] Verbindungsfehler:', error);
    toast.error('Drucker nicht erreichbar', {
      description: 'Print-Server antwortet nicht. Bon wurde nicht gedruckt.',
    });
    return false;
  }
}

/**
 * Print an order receipt
 */
export async function printOrderReceipt(order: Order): Promise<boolean> {
  const text = buildReceiptText(order);
  console.log('[PrintService] Bon-Text:\n' + text);
  return printReceipt(text);
}

/**
 * Print a test page
 */
export async function printTestPage(): Promise<boolean> {
  const text = buildTestReceipt();
  return printReceipt(text);
}

/**
 * Print daily summary
 */
export async function printDailySummaryReceipt(orders: Order[]): Promise<boolean> {
  const text = buildDailySummary(orders);
  return printReceipt(text);
}

/**
 * Check if the print server is reachable (health check)
 */
export async function checkPrintServer(): Promise<boolean> {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Get the print server URL (for display)
 */
export function getPrintServerUrl(): string {
  return PRINT_SERVER_URL;
}

/**
 * Get the printer name (for display)
 */
export function getPrinterName(): string {
  return PRINTER_NAME;
}
