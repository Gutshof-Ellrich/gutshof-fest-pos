import { ReceiptBuilder, ReceiptOptions } from './receiptBuilder';
import { printQueue } from './printQueue';
import { Order, Printer, Category, CartItem } from '@/store/useAppStore';

export interface PrintResult {
  success: boolean;
  jobIds: string[];
  errors: string[];
}

class PrintService {
  /**
   * Print an order to the appropriate printers based on category assignments
   */
  async printOrder(
    order: Order,
    printers: Printer[],
    categories: Category[],
    options: { printCustomerReceipt?: boolean } = {}
  ): Promise<PrintResult> {
    const result: PrintResult = {
      success: true,
      jobIds: [],
      errors: [],
    };
    
    const activePrinters = printers.filter(p => p.isActive !== false);
    if (activePrinters.length === 0) {
      result.success = false;
      result.errors.push('Keine aktiven Drucker konfiguriert');
      return result;
    }
    
    // Group items by printer based on category assignments
    const itemsByPrinter = this.groupItemsByPrinter(order.items, categories, activePrinters);
    
    // Print to each printer
    for (const [printerId, items] of itemsByPrinter.entries()) {
      const printer = activePrinters.find(p => p.id === printerId);
      if (!printer) continue;
      
      try {
        // Create a partial order for this printer
        const partialOrder: Order = {
          ...order,
          items,
          total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        };
        
        const receiptData = ReceiptBuilder.createOrderReceipt(partialOrder, {
          isKitchenTicket: true,
          printerName: printer.name,
        });
        
        const jobId = printQueue.addJob(
          printer.id,
          printer.name,
          printer.ipAddress,
          printer.port || 9100,
          receiptData
        );
        
        result.jobIds.push(jobId);
      } catch (error) {
        result.success = false;
        result.errors.push(`Fehler bei ${printer.name}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      }
    }
    
    // Print customer receipt to default printer
    if (options.printCustomerReceipt !== false) {
      const defaultPrinter = activePrinters.find(p => p.isDefault) || activePrinters[0];
      if (defaultPrinter) {
        try {
          const customerReceipt = ReceiptBuilder.createOrderReceipt(order, {
            showHeader: true,
            showFooter: true,
            isKitchenTicket: false,
          });
          
          const jobId = printQueue.addJob(
            defaultPrinter.id,
            defaultPrinter.name,
            defaultPrinter.ipAddress,
            defaultPrinter.port || 9100,
            customerReceipt
          );
          
          result.jobIds.push(jobId);
        } catch (error) {
          result.success = false;
          result.errors.push(`Fehler beim Kundenbon: ${error instanceof Error ? error.message : 'Unbekannt'}`);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Group order items by their assigned printers
   */
  private groupItemsByPrinter(
    items: CartItem[],
    categories: Category[],
    printers: Printer[]
  ): Map<string, CartItem[]> {
    const itemsByPrinter = new Map<string, CartItem[]>();
    const defaultPrinter = printers.find(p => p.isDefault) || printers[0];
    
    for (const item of items) {
      const category = categories.find(c => c.id === item.product.categoryId);
      let targetPrinterId: string;
      
      if (category?.printerId) {
        // Use assigned printer if it exists and is active
        const assignedPrinter = printers.find(p => p.id === category.printerId);
        targetPrinterId = assignedPrinter ? assignedPrinter.id : defaultPrinter.id;
      } else {
        // Fall back to default printer
        targetPrinterId = defaultPrinter.id;
      }
      
      if (!itemsByPrinter.has(targetPrinterId)) {
        itemsByPrinter.set(targetPrinterId, []);
      }
      itemsByPrinter.get(targetPrinterId)!.push(item);
    }
    
    return itemsByPrinter;
  }
  
  /**
   * Print a test receipt
   */
  async printTest(printer: Printer): Promise<string> {
    const testData = ReceiptBuilder.createTestReceipt(printer.name);
    
    return printQueue.addJob(
      printer.id,
      printer.name,
      printer.ipAddress,
      printer.port || 9100,
      testData
    );
  }
  
  /**
   * Print daily summary
   */
  async printDailySummary(orders: Order[], printer: Printer): Promise<string> {
    const summaryData = ReceiptBuilder.createDailySummary(orders);
    
    return printQueue.addJob(
      printer.id,
      printer.name,
      printer.ipAddress,
      printer.port || 9100,
      summaryData
    );
  }
}

// Singleton instance
export const printService = new PrintService();
