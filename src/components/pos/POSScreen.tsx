import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore, Product, Order, PaymentMethod } from '@/store/useAppStore';
import CategoryGrid from './CategoryGrid';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentDialog from './PaymentDialog';
import OpenTablesPanel from './OpenTablesPanel';
import OrderHistoryDialog from './OrderHistoryDialog';
import { printOrderToMatchingPrinters, fetchPrinters } from '@/services/printService';
import type { LanPrinter } from '@/types/printer';
import { toast } from 'sonner';
import { buildOrderPayload, saveCompletedOrderToBackend } from '@/services/orderService';
import { createKitchenOrder } from '@/services/kitchenService';
import { fetchNextCounter } from '@/services/counterService';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart, Clock, Receipt } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface POSScreenProps {
  role: 'bar' | 'food' | 'combined';
  onLogout: () => void;
}

const POSScreen = ({ role, onLogout }: POSScreenProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenTables, setShowOpenTables] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const isMobile = useIsMobile();

  const { setServiceType } = useAppStore();
  const [lanPrinters, setLanPrinters] = useState<LanPrinter[]>([]);

  useEffect(() => {
    const defaultServiceType = role === 'bar' ? 'togo' : 'service';
    setServiceType(defaultServiceType);
  }, [role, setServiceType]);

  // Load printers from backend on mount
  useEffect(() => {
    fetchPrinters().then(setLanPrinters).catch(() => console.warn('[Print] Print-Service offline'));
  }, []);

  const {
    categories,
    products,
    cart,
    deposit,
    serviceType,
    depositPerGlass,
    tables,
    tableTabs,
    orders,
    getNextTogoNumber,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemNote,
    clearCart,
    setNewDeposits,
    setReturnedDeposits,
    addOrder,
    addToTableTab,
  } = useAppStore();

  // Filter categories based on role
  const filteredCategories = useMemo(() => {
    if (role === 'combined') {
      return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const type = role === 'bar' ? 'drinks' : 'food';
    return categories.filter((cat) => cat.type === type);
  }, [categories, role]);

  const showDeposit = role === 'bar' || role === 'combined';

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

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
    
    const activeTables = tables.filter(t => t.isActive);
    if (serviceType === 'service' && activeTables.length > 0 && !selectedTableId) {
      toast.error('Bitte wählen Sie einen Tisch aus');
      return;
    }
    
    setMobileCartOpen(false);
    setShowPayment(true);
  };

  const finalizeOrder = useCallback(async (order: Order) => {
    console.log('[checkout] finalizeOrder aufgerufen', { orderId: order.id, paymentMethod: order.paymentMethod });
    setIsSavingOrder(true);
    setPendingOrder(order);

    try {
      console.log('[checkout] build payload start', order);
      const payload = buildOrderPayload(order, categories);
      console.log('[checkout] build payload success', payload);
      console.log('[checkout] save order start', { endpoint: 'http://192.168.188.200:3444/api/orders/save' });
      await saveCompletedOrderToBackend(payload);
      console.log('[checkout] save order success');
    } catch (error) {
      console.error('[checkout] save order FAILED', error);
      setIsSavingOrder(false);
      toast.error('Fehler beim Speichern der Bestellung. Bitte erneut versuchen.', {
        duration: 10000,
      });
      return; // Do NOT print, do NOT clear cart
    }

    // Save succeeded → send food items to kitchen monitor
    const foodCategories = categories.filter((c) => c.type === 'food');
    const foodCatIds = new Set(foodCategories.map((c) => c.id));
    const foodItems = order.items
      .filter((item) => foodCatIds.has(item.product.categoryId))
      .map((item) => ({
        name: item.product.name,
        qty: item.quantity,
        note: item.note || '',
      }));

    if (foodItems.length > 0) {
      const orderNum = order.togoNumber !== undefined
        ? `TOGO-${order.togoNumber}`
        : order.serviceNumber !== undefined
          ? `SERV-${order.serviceNumber}`
          : order.tableName || order.id.slice(-4);
      createKitchenOrder({
        id: `ko-${order.id}`,
        orderId: order.id,
        orderNumber: orderNum,
        createdAt: new Date().toISOString(),
        items: foodItems,
      }).catch((err) => console.warn('[kitchen] failed to send:', err));
    }

    setIsSavingOrder(false);
    setPendingOrder(null);

    addOrder(order);

    if (!order.isPaid && order.serviceType === 'service' && order.tableId && order.tableName) {
      addToTableTab(order.tableId, order.tableName, order);
    }

    // Print to all matching LAN printers
    if (order.items.length > 0) {
      console.log('[checkout] print start');
      printOrderToMatchingPrinters(order, lanPrinters, role).then(({ failed }) => {
        failed.forEach((name) => {
          toast.error(`Druck fehlgeschlagen: ${name}`, {
            action: {
              label: 'Erneut drucken',
              onClick: () => printOrderToMatchingPrinters(order, lanPrinters, role),
            },
          });
        });
      });
    }

    console.log('[checkout] clear cart');
    clearCart();
    setShowPayment(false);
    setSelectedCategoryId(null);
    setSelectedTableId(null);
    setSelectedTableName(null);

    const tableInfo = order.serviceType === 'service' && order.tableName
      ? ` - Tisch ${order.tableName}`
      : '';

    if (order.isPaid) {
      const togoInfo = order.serviceType === 'togo' && order.togoNumber !== undefined ? ` | TOGO-${order.togoNumber}` : '';
      const servInfo = order.serviceNumber !== undefined ? ` | SERV-${order.serviceNumber}` : '';
      const drinkInfo = order.drinkNumber !== undefined ? ` | DRINK-${order.drinkNumber}` : '';
      toast.success(
        `Bestellung ${order.serviceType === 'togo' ? 'TO GO' : 'SERVICE'}${tableInfo} abgeschlossen`,
        {
          description: `${order.grandTotal.toFixed(2).replace('.', ',')} € - ${order.paymentMethod === 'cash' ? 'Bar' : 'Karte'}${togoInfo}${servInfo}${drinkInfo}`,
        }
      );
    } else {
      toast.success(
        `Bestellung auf Tisch ${order.tableName} gebucht`,
        {
          description: `${order.grandTotal.toFixed(2).replace('.', ',')} € - Zahlung später`,
        }
      );
    }
  }, [categories, lanPrinters, role, addOrder, addToTableTab, clearCart]);

  const handleRetryOrder = useCallback(() => {
    if (pendingOrder) {
      finalizeOrder(pendingOrder);
    }
  }, [pendingOrder, finalizeOrder]);

  const handlePaymentConfirm = async (paymentMethod: PaymentMethod, payNow: boolean, amountPaid?: number) => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const depositSaldo = (deposit.newDeposits - deposit.returnedDeposits) * depositPerGlass;
    const grandTotal = itemsTotal + depositSaldo;

    const togoNumber = (serviceType === 'togo' && payNow) ? getNextTogoNumber() : undefined;

    // Fetch backend counters for service and drink numbers
    let serviceNumber: number | undefined;
    let drinkNumber: number | undefined;

    if (payNow) {
      const foodCatIds = new Set(categories.filter(c => c.type === 'food').map(c => c.id));
      const drinkCatIds = new Set(categories.filter(c => c.type === 'drinks').map(c => c.id));
      const hasFoodItems = cart.some(item => foodCatIds.has(item.product.categoryId));
      const hasDrinkItems = cart.some(item => drinkCatIds.has(item.product.categoryId));

      try {
        if (serviceType === 'service' && togoNumber === undefined) {
          serviceNumber = await fetchNextCounter('service');
        }
        if (hasDrinkItems) {
          drinkNumber = await fetchNextCounter('drink');
        }
      } catch (err) {
        console.warn('[checkout] counter fetch failed, using fallback', err);
      }
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      items: [...cart],
      deposit: { ...deposit, depositValue: depositPerGlass },
      serviceType,
      paymentMethod: payNow ? paymentMethod : 'cash',
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
      togoNumber,
      serviceNumber,
      drinkNumber,
    };

    await finalizeOrder(order);
  };

  const roleTitle = role === 'bar' ? 'Getränke' : role === 'food' ? 'Speisen' : 'Komplett';
  const roleColor = role === 'bar' ? 'text-primary' : role === 'food' ? 'text-success' : 'text-violet-600';
  
  const openTablesCount = tableTabs.length;
  
  const todayOrdersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter(o => o.isPaid && o.role === role && new Date(o.timestamp) >= today).length;
  }, [orders, role]);

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
    categories,
    onUpdateQuantity: updateCartQuantity,
    onRemoveItem: removeFromCart,
    onSetNewDeposits: setNewDeposits,
    onSetReturnedDeposits: setReturnedDeposits,
    onSetServiceType: setServiceType,
    onSelectTable: handleTableSelect,
    onCheckout: handleCheckout,
    onClearCart: clearCart,
    onSetItemNote: setCartItemNote,
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
            <button
              onClick={() => setShowOrderHistory(true)}
              className="relative touch-btn-secondary text-sm md:text-base py-1.5 px-3 md:py-2 md:px-4 min-h-0 flex items-center gap-1"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden md:inline">Historie</span>
              {todayOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {todayOrdersCount}
                </span>
              )}
            </button>
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
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 md:pb-6 custom-scrollbar">
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

        <div className="hidden md:flex md:w-[350px] lg:w-[400px] border-l border-border p-4 flex-col">
          <CartPanel {...cartPanelProps} />
        </div>
      </main>

      {/* Mobile Floating Cart Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
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
                  {cartTotal.toFixed(2).replace('.', ',')} EUR
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

      <PaymentDialog
        isOpen={showPayment}
        onClose={() => { if (!isSavingOrder) setShowPayment(false); }}
        onConfirm={handlePaymentConfirm}
        items={cart}
        deposit={deposit}
        depositPerGlass={depositPerGlass}
        serviceType={serviceType}
        tableName={selectedTableName}
        allowPayLater={serviceType === 'service' && !!selectedTableId}
        role={role}
        isSaving={isSavingOrder}
      />

      {/* Retry overlay when order save failed */}
      {pendingOrder && !isSavingOrder && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-soft-lg w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="text-center space-y-2">
              <span className="text-4xl">⚠️</span>
              <h3 className="font-display text-xl font-bold text-foreground">
                Speichern fehlgeschlagen
              </h3>
              <p className="text-muted-foreground">
                Die Bestellung konnte nicht gespeichert werden. Bitte erneut versuchen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPendingOrder(null); }}
                className="flex-1 touch-btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRetryOrder}
                className="flex-1 touch-btn-success"
              >
                Erneut speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <OpenTablesPanel
        isOpen={showOpenTables}
        onClose={() => setShowOpenTables(false)}
      />

      <OrderHistoryDialog
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        role={role}
      />
    </div>
  );
};

export default POSScreen;
