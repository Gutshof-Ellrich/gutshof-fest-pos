import { useState, useMemo } from 'react';
import { useAppStore, UserRole, Product, Order, PaymentMethod } from '@/store/useAppStore';
import CategoryGrid from './CategoryGrid';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentDialog from './PaymentDialog';
import { toast } from 'sonner';

interface POSScreenProps {
  role: 'bar' | 'food';
  onLogout: () => void;
}

const POSScreen = ({ role, onLogout }: POSScreenProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const {
    categories,
    products,
    cart,
    deposit,
    serviceType,
    depositPerGlass,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setNewDeposits,
    setReturnedDeposits,
    setServiceType,
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

  const handleCheckout = () => {
    if (cart.length === 0 && (deposit.newDeposits === 0 && deposit.returnedDeposits === 0)) {
      toast.error('Warenkorb ist leer');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentConfirm = (paymentMethod: PaymentMethod, amountPaid?: number) => {
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
    };

    addOrder(order);
    clearCart();
    setShowPayment(false);
    setSelectedCategoryId(null);

    toast.success(
      `Bestellung ${serviceType === 'togo' ? 'TO GO' : 'SERVICE'} abgeschlossen`,
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Gutshof Ellrich
            </h1>
            <span className="text-muted-foreground">|</span>
            <span className={`font-display text-xl font-semibold ${roleColor}`}>
              {roleTitle}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="touch-btn-secondary text-base py-2 px-4 min-h-0"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side - Categories & Products */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Categories */}
          <div className="mb-6">
            <h2 className="font-display text-lg font-semibold text-muted-foreground mb-4">
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
            <h2 className="font-display text-lg font-semibold text-muted-foreground mb-4">
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

        {/* Right Side - Cart */}
        <div className="w-[400px] border-l border-border p-4 flex flex-col">
          <CartPanel
            items={cart}
            deposit={deposit}
            serviceType={serviceType}
            depositPerGlass={depositPerGlass}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onSetNewDeposits={setNewDeposits}
            onSetReturnedDeposits={setReturnedDeposits}
            onSetServiceType={setServiceType}
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
      />
    </div>
  );
};

export default POSScreen;
