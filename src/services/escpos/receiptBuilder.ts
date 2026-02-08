import { 
  ESCPOS, 
  RECEIPT_WIDTH, 
  createSeparator, 
  formatLine, 
  centerText, 
  formatCurrency,
  formatItemLine 
} from './commands';
import { Order, CartItem, DepositInfo } from '@/store/useAppStore';

export interface ReceiptOptions {
  showHeader?: boolean;
  showFooter?: boolean;
  isKitchenTicket?: boolean;
  printerName?: string;
  copies?: number;
}

export class ReceiptBuilder {
  private lines: string[] = [];
  
  constructor() {
    this.init();
  }
  
  private init(): this {
    this.lines = [];
    this.lines.push(ESCPOS.INIT);
    this.lines.push(ESCPOS.SELECT_GERMAN);
    return this;
  }
  
  addText(text: string): this {
    this.lines.push(text);
    return this;
  }
  
  addLine(text: string = ''): this {
    this.lines.push(text + ESCPOS.FEED_LINE);
    return this;
  }
  
  addCenteredText(text: string): this {
    this.lines.push(ESCPOS.ALIGN_CENTER);
    this.lines.push(text + ESCPOS.FEED_LINE);
    this.lines.push(ESCPOS.ALIGN_LEFT);
    return this;
  }
  
  addBoldText(text: string): this {
    this.lines.push(ESCPOS.BOLD_ON + text + ESCPOS.BOLD_OFF);
    return this;
  }
  
  addDoubleSize(text: string): this {
    this.lines.push(ESCPOS.DOUBLE_SIZE_ON + text + ESCPOS.NORMAL_SIZE + ESCPOS.FEED_LINE);
    return this;
  }
  
  addSeparator(char: string = '-'): this {
    this.lines.push(createSeparator(char) + ESCPOS.FEED_LINE);
    return this;
  }
  
  addFormattedLine(left: string, right: string): this {
    this.lines.push(formatLine(left, right) + ESCPOS.FEED_LINE);
    return this;
  }
  
  addEmptyLines(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.lines.push(ESCPOS.FEED_LINE);
    }
    return this;
  }
  
  cutPaper(): this {
    this.lines.push(ESCPOS.FEED_PARTIAL);
    this.lines.push(ESCPOS.CUT_PARTIAL);
    return this;
  }
  
  openCashDrawer(): this {
    this.lines.push(ESCPOS.OPEN_DRAWER);
    return this;
  }
  
  build(): string {
    return this.lines.join('');
  }
  
  // Pre-built receipt types
  static createOrderReceipt(order: Order, options: ReceiptOptions = {}): string {
    const builder = new ReceiptBuilder();
    const isKitchen = options.isKitchenTicket ?? false;
    const timestamp = new Date(order.timestamp);
    const dateStr = timestamp.toLocaleDateString('de-DE');
    const timeStr = timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    // Header
    if (options.showHeader !== false && !isKitchen) {
      builder.addCenteredText(ESCPOS.BOLD_ON + 'Gutshof Ellrich' + ESCPOS.BOLD_OFF);
      builder.addCenteredText('Weinfest 2025');
      builder.addEmptyLines(1);
    }
    
    // Kitchen ticket gets big SERVICE/TOGO header
    if (isKitchen) {
      builder.addCenteredText(ESCPOS.DOUBLE_SIZE_ON + (order.serviceType === 'service' ? 'SERVICE' : 'TO GO') + ESCPOS.NORMAL_SIZE);
      if (order.serviceType === 'service' && order.tableName) {
        builder.addCenteredText(ESCPOS.DOUBLE_SIZE_ON + 'TISCH ' + order.tableName + ESCPOS.NORMAL_SIZE);
      }
      builder.addEmptyLines(1);
    }
    
    // Date/Time and Order Info
    builder.addSeparator();
    builder.addFormattedLine('Datum:', dateStr);
    builder.addFormattedLine('Uhrzeit:', timeStr);
    
    // Service Type with Table for regular receipts
    if (!isKitchen) {
      if (order.serviceType === 'service') {
        const tableInfo = order.tableName ? ` - Tisch ${order.tableName}` : '';
        builder.addLine(ESCPOS.BOLD_ON + 'SERVICE' + tableInfo + ESCPOS.BOLD_OFF);
      } else {
        builder.addLine(ESCPOS.BOLD_ON + 'TO GO' + ESCPOS.BOLD_OFF);
      }
    }
    
    builder.addSeparator();
    
    // Items
    if (order.items.length > 0) {
      order.items.forEach((item) => {
        builder.addLine(formatItemLine(item.quantity, item.product.name, item.product.price));
      });
    }
    
    // Deposit section (not on kitchen tickets)
    if (!isKitchen) {
      const depositSaldo = (order.deposit.newDeposits - order.deposit.returnedDeposits) * order.deposit.depositValue;
      if (order.deposit.newDeposits > 0 || order.deposit.returnedDeposits > 0) {
        builder.addSeparator();
        builder.addLine(ESCPOS.BOLD_ON + 'Pfand:' + ESCPOS.BOLD_OFF);
        if (order.deposit.newDeposits > 0) {
        builder.addFormattedLine(
            `  Neu: ${order.deposit.newDeposits} Glaeser`,
            formatCurrency(order.deposit.newDeposits * order.deposit.depositValue)
          );
        }
        if (order.deposit.returnedDeposits > 0) {
          builder.addFormattedLine(
            `  Zurueck: ${order.deposit.returnedDeposits} Glaeser`,
            '-' + formatCurrency(order.deposit.returnedDeposits * order.deposit.depositValue)
          );
        }
        builder.addFormattedLine('  Pfand-Saldo:', formatCurrency(depositSaldo));
      }
    }
    
    // Totals (not on kitchen tickets)
    if (!isKitchen) {
      builder.addSeparator('=');
      builder.addFormattedLine('Summe Artikel:', formatCurrency(order.total));
      if (order.depositTotal !== 0) {
        builder.addFormattedLine('Pfand:', formatCurrency(order.depositTotal));
      }
      builder.addLine(ESCPOS.BOLD_ON + formatLine('GESAMT:', formatCurrency(order.grandTotal)) + ESCPOS.BOLD_OFF);
      builder.addSeparator('=');
      
      // Payment Info
      builder.addFormattedLine('Zahlungsart:', order.paymentMethod === 'cash' ? 'Bar' : 'Karte');
      if (order.paymentMethod === 'cash' && order.amountPaid) {
        builder.addFormattedLine('Gegeben:', formatCurrency(order.amountPaid));
        builder.addFormattedLine('Rueckgeld:', formatCurrency(order.change || 0));
      }
    }
    
    // Footer
    if (options.showFooter !== false && !isKitchen) {
      builder.addEmptyLines(1);
      builder.addCenteredText('Vielen Dank!');
      builder.addCenteredText('Wir freuen uns auf Ihren');
      builder.addCenteredText('naechsten Besuch!');
    }
    
    builder.addEmptyLines(3);
    builder.cutPaper();
    
    return builder.build();
  }
  
  static createTestReceipt(printerName: string): string {
    const builder = new ReceiptBuilder();
    const now = new Date();
    
    builder.addCenteredText(ESCPOS.DOUBLE_SIZE_ON + 'TESTDRUCK' + ESCPOS.NORMAL_SIZE);
    builder.addEmptyLines(1);
    builder.addCenteredText('Gutshof Ellrich - Weinfest');
    builder.addSeparator();
    builder.addFormattedLine('Drucker:', printerName);
    builder.addFormattedLine('Datum:', now.toLocaleDateString('de-DE'));
    builder.addFormattedLine('Zeit:', now.toLocaleTimeString('de-DE'));
    builder.addSeparator();
    builder.addLine('Zeichentest:');
    builder.addLine('AeOeUe aeoeue ss EUR @ # &');
    builder.addLine('0123456789');
    builder.addSeparator();
    builder.addCenteredText('Druck erfolgreich!');
    builder.addEmptyLines(3);
    builder.cutPaper();
    
    return builder.build();
  }
  
  static createDailySummary(
    orders: Order[], 
    date: Date = new Date()
  ): string {
    const builder = new ReceiptBuilder();
    
    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOrders = orders.length;
    const cashOrders = orders.filter(o => o.paymentMethod === 'cash');
    const cardOrders = orders.filter(o => o.paymentMethod === 'card');
    const cashTotal = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const cardTotal = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const depositTotal = orders.reduce((sum, o) => sum + o.depositTotal, 0);
    
    builder.addCenteredText(ESCPOS.DOUBLE_SIZE_ON + 'TAGESABSCHLUSS' + ESCPOS.NORMAL_SIZE);
    builder.addEmptyLines(1);
    builder.addCenteredText('Gutshof Ellrich - Weinfest');
    builder.addCenteredText(date.toLocaleDateString('de-DE'));
    builder.addSeparator('=');
    
    builder.addLine(ESCPOS.BOLD_ON + 'UEBERSICHT' + ESCPOS.BOLD_OFF);
    builder.addFormattedLine('Anzahl Bestellungen:', totalOrders.toString());
    builder.addFormattedLine('Gesamtumsatz:', formatCurrency(totalRevenue));
    builder.addSeparator();
    
    builder.addLine(ESCPOS.BOLD_ON + 'ZAHLUNGSARTEN' + ESCPOS.BOLD_OFF);
    builder.addFormattedLine(`Bar (${cashOrders.length}x):`, formatCurrency(cashTotal));
    builder.addFormattedLine(`Karte (${cardOrders.length}x):`, formatCurrency(cardTotal));
    builder.addSeparator();
    
    builder.addLine(ESCPOS.BOLD_ON + 'PFAND' + ESCPOS.BOLD_OFF);
    builder.addFormattedLine('Pfand-Saldo:', formatCurrency(depositTotal));
    
    builder.addSeparator('=');
    builder.addEmptyLines(3);
    builder.cutPaper();
    
    return builder.build();
  }
}
