import { useState, useMemo, useEffect } from 'react';
import { useAppStore, Product, Order, PaymentMethod } from '@/store/useAppStore';
import CategoryGrid from './CategoryGrid';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentDialog from './PaymentDialog';
import { printService } from '@/services/escpos';
import { toast } from 'sonner';

interface POSScreenProps {
  role: 'bar' | 'food';
  onLogout: () => void;
}

const POSScreen = ({ role, onLogout }: POSScreenProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  const { setServiceType } = useAppStore();

  // Set default service type based on role
  useEffect(() => {
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
    printers,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setNewDeposits,
    setReturnedDeposits,
    addOrder,
  } = useAppStore();

  // Filter categories based on role
  const filteredCategories = useMemo(() => {
    const type = role === 'bar' ? 'drinks' : 'food';
    return categories.filter((cat) => cat.type === type);
  }, [categories, role]);

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

  const handlePaymentConfirm = async (paymentMethod: PaymentMethod, amountPaid?: number) => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const depositSaldo = (deposit.newDeposits - deposit.returnedDeposits) * depositPerGlass;
    const grandTotal = itemsTotal + depositSaldo;

    const order: Order = {
      id: `order-${Date.now()}`,
      items: [...cart],
      deposit: { ...deposit, depositValue: depositPerGlass },
      serviceType,
      paymentMethod,
      total: itemsTotal,
      depositTotal: depositSaldo,
      grandTotal,
      amountPaid,
      change: amountPaid ? amountPaid - grandTotal : undefined,
      timestamp: new Date(),
      role,
      tableId: serviceType === 'service' ? selectedTableId || undefined : undefined,
      tableName: serviceType === 'service' ? selectedTableName || undefined : undefined,
    };

    addOrder(order);
    
    // Trigger print to appropriate printers
    const activePrinters = printers.filter(p => p.isActive);
    if (activePrinters.length > 0 && order.items.length > 0) {
      const printResult = await printService.printOrder(order, printers, categories, {
        printCustomerReceipt: true,
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

    toast.success(
      `Bestellung ${serviceType === 'togo' ? 'TO GO' : 'SERVICE'}${tableInfo} abgeschlossen`,
      {
        description: `${grandTotal.toFixed(2).replace('.', ',')} € - ${paymentMethod === 'cash' ? 'Bar' : 'Karte'}`,
      }
    );
  };

  const roleTitle = role === 'bar' ? 'Getränke' : 'Speisen';
  const roleColor = role === 'bar' ? 'text-primary' : 'text-success';

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
          <button
            onClick={onLogout}
            className="touch-btn-secondary text-sm md:text-base py-1.5 px-3 md:py-2 md:px-4 min-h-0"
          >
            HOME
          </button>
        </div>
      </header>

      {/* Main Content - Stacked on mobile, side-by-side on tablet+ */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Categories & Products */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar">
          {/* Categories */}
          <div className="mb-4 md:mb-6">
            <h2 className="font-display text-base md:text-lg font-semibold text-muted-foreground mb-2 md:mb-4">
              Kategorien
            </h2>
            <CategoryGrid
              categories={filteredCategories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
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

        {/* Right Side - Cart (full width on mobile, fixed width on tablet+) */}
        <div className="lg:w-[400px] border-t lg:border-t-0 lg:border-l border-border p-2 md:p-4 flex flex-col max-h-[50vh] lg:max-h-none">
          <CartPanel
            items={cart}
            deposit={deposit}
            serviceType={serviceType}
            depositPerGlass={depositPerGlass}
            selectedTableId={selectedTableId}
            selectedTableName={selectedTableName}
            tables={tables}
            showDeposit={role === 'bar'}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onSetNewDeposits={setNewDeposits}
            onSetReturnedDeposits={setReturnedDeposits}
            onSetServiceType={setServiceType}
            onSelectTable={handleTableSelect}
            onCheckout={handleCheckout}
            onClearCart={clearCart}
          />
        </div>
      </main>

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
      />
    </div>
  );
};

export default POSScreen;
