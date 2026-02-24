// ─── Printer configuration (stored on backend) ──────────────────
export interface LanPrinter {
  id: string;
  displayName: string;
  cupsQueue: string;
  enabled: boolean;
  assignedRoles: ('bar' | 'food' | 'combined')[];
  protocol: 'ESC_POS';
  charsPerLine: number;
  fontMode: 'NORMAL' | 'DOUBLE_WIDTH';
  codePage: 'PC858';
  replaceEuro: boolean;
  transliterateGerman: boolean;
  cutAfterPrint: boolean;
}

export type LanPrinterDraft = Omit<LanPrinter, 'id'>;

// ─── Receipt payload sent to print-service ───────────────────────
export interface ReceiptItem {
  qty: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptPayload {
  id: string;
  timestamp: string; // ISO
  role: string;
  serviceType: 'SERVICE' | 'TOGO';
  tableNumber?: string;
  togoNumber?: number;
  items: ReceiptItem[];
  totals: { grandTotal: number };
  payment: {
    method: 'CASH' | 'CARD';
    receivedAmount?: number;
    changeAmount?: number;
    deferred?: boolean;
  };
}

// ─── Archived receipt from backend ───────────────────────────────
export interface ArchivedReceipt extends ReceiptPayload {
  printedAt: string;
  printers: string[]; // queue names that printed
}
