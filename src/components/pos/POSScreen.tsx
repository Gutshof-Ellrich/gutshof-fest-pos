import { useState, useMemo, useEffect } from 'react';
import { useAppStore, Product, Order, PaymentMethod } from '@/store/useAppStore';
import CategoryGrid from './CategoryGrid';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentDialog from './PaymentDialog';
import OpenTablesPanel from './OpenTablesPanel';
import { printService } from '@/services/escpos';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface POSScreenProps {
  role: 'bar' | 'food' | 'combined';
  onLogout: () => void;
}

const POSScreen = ({ role, onLogout }: POSScreenProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenTables, setShowOpenTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const isMobile = useIsMobile();

  const { setServiceType } = useAppStore();

  // Set default service type based on role
  useEffect(() => {
    // Bar defaults to togo, food and combined default to service
    const defaultServiceType = role === 'bar' ? 'togo' : 'service';
    setServiceType(defaultServiceType);
  }, [role, setServiceType]);

  const {
    categories,
    products,
    cart,
    deposit,
    serviceType,
    depositPerGlass,
    tables,
    tableTabs,
    printers,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setNewDeposits,
    setReturnedDeposits,
    addOrder,
    addToTableTab,
  } = useAppStore();

  // Filter categories based on role
  const filteredCategories = useMemo(() => {
    if (role === 'combined') {
      // Show all categories for combined role
      return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const type = role === 'bar' ? 'drinks' : 'food';
    return categories.filter((cat) => cat.type === type);
  }, [categories, role]);

  // Determine if deposit should be shown (bar and combined roles)
  const showDeposit = role === 'bar' || role === 'combined';

  // Get products for selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  // Calculate cart quantities for display
  const cartQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    cart.forEach((item) => {
      quantities[item.product.id] = item.quantity;
    });
    return quantities;
  }, [cart]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const handleTableSelect = (tableId: string | null, tableName: string | null) => {
    setSelectedTableId(tableId);
    setSelectedTableName(tableName);
  };

  const handleCheckout = () => {
    if (cart.length === 0 && (deposit.newDeposits === 0 && deposit.returnedDeposits === 0)) {
      toast.error('Warenkorb ist leer');
      return;
    }
    
    // Check table requirement for service orders
    const activeTables = tables.filter(t => t.isActive);
    if (serviceType === 'service' && activeTables.length > 0 && !selectedTableId) {
      toast.error('Bitte wählen Sie einen Tisch aus');
      return;
    }
    
    setShowPayment(true);
  };

  const handlePaymentConfirm = async (paymentMethod: PaymentMethod, payNow: boolean, amountPaid?: number) => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const depositSaldo = (deposit.newDeposits - deposit.returnedDeposits) * depositPerGlass;
    const grandTotal = itemsTotal + depositSaldo;

    const order: Order = {
      id: `order-${Date.now()}`,
      items: [...cart],
      deposit: { ...deposit, depositValue: depositPerGlass },
      serviceType,
      paymentMethod: payNow ? paymentMethod : 'cash', // Default for unpaid orders
      total: itemsTotal,
      depositTotal: depositSaldo,
      grandTotal,
      amountPaid: payNow ? amountPaid : undefined,
      change: payNow && amountPaid ? amountPaid - grandTotal : undefined,
      timestamp: new Date(),
      role,
      tableId: serviceType === 'service' ? selectedTableId || undefined : undefined,
      tableName: serviceType === 'service' ? selectedTableName || undefined : undefined,
      isPaid: payNow,
    };

    addOrder(order);

    // If pay later, add to table tab
    if (!payNow && serviceType === 'service' && selectedTableId && selectedTableName) {
      addToTableTab(selectedTableId, selectedTableName, order);
    }
    
    // Trigger print to appropriate printers
    const activePrinters = printers.filter(p => p.isActive);
    if (activePrinters.length > 0 && order.items.length > 0) {
      const printResult = await printService.printOrder(order, printers, categories, {
        printCustomerReceipt: payNow, // Only print customer receipt if paying now
      });
      
      if (!printResult.success && printResult.errors.length > 0) {
        toast.warning('Druckproblem', {
          description: printResult.errors.join(', '),
        });
      }
    }
    
    clearCart();
    setShowPayment(false);
    setSelectedCategoryId(null);
    setSelectedTableId(null);
    setSelectedTableName(null);

    const tableInfo = serviceType === 'service' && selectedTableName 
      ? ` – Tisch ${selectedTableName}` 
      : '';

    if (payNow) {
      toast.success(
        `Bestellung ${serviceType === 'togo' ? 'TO GO' : 'SERVICE'}${tableInfo} abgeschlossen`,
        {
          description: `${grandTotal.toFixed(2).replace('.', ',')} € - ${paymentMethod === 'cash' ? 'Bar' : 'Karte'}`,
        }
      );
    } else {
      toast.success(
        `Bestellung auf Tisch ${selectedTableName} gebucht`,
        {
          description: `${grandTotal.toFixed(2).replace('.', ',')} € - Zahlung später`,
        }
      );
    }
  };

  const roleTitle = role === 'bar' ? 'Getränke' : role === 'food' ? 'Speisen' : 'Komplett';
  const roleColor = role === 'bar' ? 'text-primary' : role === 'food' ? 'text-success' : 'text-violet-600';
  
  // Count open tables for badge
  const openTablesCount = tableTabs.length;

  // Calculate total items in cart for badge
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = useMemo(() => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const depositSaldo = showDeposit ? (deposit.newDeposits - deposit.returnedDeposits) * depositPerGlass : 0;
    return itemsTotal + depositSaldo;
  }, [cart, deposit, depositPerGlass, showDeposit]);

  const cartPanelProps = {
    items: cart,
    deposit,
    serviceType,
    depositPerGlass,
    selectedTableId,
    selectedTableName,
    tables,
    showDeposit,
    onUpdateQuantity: updateCartQuantity,
    onRemoveItem: removeFromCart,
    onSetNewDeposits: setNewDeposits,
    onSetReturnedDeposits: setReturnedDeposits,
    onSetServiceType: setServiceType,
    onSelectTable: handleTableSelect,
    onCheckout: handleCheckout,
    onClearCart: clearCart,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 py-2 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="font-display text-lg md:text-2xl font-bold text-foreground">
              Gutshof Ellrich
            </h1>
            <span className="text-muted-foreground hidden md:inline">|</span>
            <span className={`font-display text-base md:text-xl font-semibold ${roleColor}`}>
              {roleTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Open Tables Button */}
            <button
              onClick={() => setShowOpenTables(true)}
              className="relative touch-btn-secondary text-sm md:text-base py-1.5 px-3 md:py-2 md:px-4 min-h-0 flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden md:inline">Offene Tische</span>
              {openTablesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {openTablesCount}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="touch-btn-secondary text-sm md:text-base py-1.5 px-3 md:py-2 md:px-4 min-h-0"
            >
              HOME
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Categories & Products */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 lg:pb-6 custom-scrollbar">
          {/* Categories */}
          <div className="mb-4 md:mb-6">
            <h2 className="font-display text-base md:text-lg font-semibold text-muted-foreground mb-2 md:mb-4">
              Kategorien
            </h2>
            <CategoryGrid
              categories={filteredCategories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              groupByType={role === 'combined'}
            />
          </div>

          {/* Products */}
          <div>
            <h2 className="font-display text-base md:text-lg font-semibold text-muted-foreground mb-2 md:mb-4">
              {selectedCategoryId
                ? categories.find((c) => c.id === selectedCategoryId)?.name || 'Produkte'
                : 'Produkte'}
            </h2>
            <ProductGrid
              products={categoryProducts}
              onAddToCart={handleAddToCart}
              cartQuantities={cartQuantities}
            />
          </div>
        </div>

        {/* Desktop Cart - Hidden on mobile */}
        <div className="hidden lg:flex lg:w-[400px] border-l border-border p-4 flex-col">
          <CartPanel {...cartPanelProps} />
        </div>
      </main>

      {/* Mobile Floating Cart Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
          <SheetTrigger asChild>
            <button className="relative w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
              <ShoppingCart className="w-7 h-7" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[24px] h-6 rounded-full bg-destructive text-destructive-foreground text-sm font-bold flex items-center justify-center px-1">
                  {totalCartItems}
                </span>
              )}
              {cartTotal > 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-card text-foreground text-xs font-semibold px-2 py-0.5 rounded-full shadow border border-border whitespace-nowrap">
                  {cartTotal.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
            <div className="h-full flex flex-col">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-2" />
              <div className="flex-1 overflow-hidden p-3">
                <CartPanel {...cartPanelProps} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handlePaymentConfirm}
        items={cart}
        deposit={deposit}
        depositPerGlass={depositPerGlass}
        serviceType={serviceType}
        tableName={selectedTableName}
        allowPayLater={serviceType === 'service' && !!selectedTableId}
      />

      {/* Open Tables Panel */}
      <OpenTablesPanel
        isOpen={showOpenTables}
        onClose={() => setShowOpenTables(false)}
      />
    </div>
  );
};

export default POSScreen;
