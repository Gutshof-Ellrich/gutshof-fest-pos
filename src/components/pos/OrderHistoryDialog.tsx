import { useState, useMemo } from 'react';
import { useAppStore, Order } from '@/store/useAppStore';
import { Clock, Search, Receipt, Banknote, CreditCard, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface OrderHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderHistoryDialog = ({ isOpen, onClose }: OrderHistoryDialogProps) => {
  const { orders, clearOrders } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter and sort orders (newest first)
  const filteredOrders = useMemo(() => {
    const paidOrders = orders.filter(o => o.isPaid);
    
    if (!searchQuery.trim()) {
      return paidOrders.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    const query = searchQuery.toLowerCase();
    return paidOrders.filter(order => {
      // Search by table name
      if (order.tableName?.toLowerCase().includes(query)) return true;
      
      // Search by time
      const timeStr = formatTime(new Date(order.timestamp));
      if (timeStr.includes(query)) return true;
      
      // Search by product names
      if (order.items.some(item => 
        item.product.name.toLowerCase().includes(query)
      )) return true;
      
      // Search by order ID
      if (order.id.toLowerCase().includes(query)) return true;
      
      // Search by amount
      const amountStr = order.grandTotal.toFixed(2).replace('.', ',');
      if (amountStr.includes(query)) return true;

      return false;
    }).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [orders, searchQuery]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    
    filteredOrders.forEach(order => {
      const dateKey = formatDate(new Date(order.timestamp));
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });
    
    return groups;
  }, [filteredOrders]);

  const getOrderNumber = (order: Order) => {
    // Extract a short readable number from the order ID
    const timestamp = order.id.replace('order-', '');
    return `#${timestamp.slice(-6)}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Bestellhistorie
            </DialogTitle>
            {filteredOrders.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Reset
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bestellhistorie löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle {orders.filter(o => o.isPaid).length} abgeschlossenen Bestellungen werden unwiderruflich gelöscht. 
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        clearOrders();
                        toast.success('Bestellhistorie wurde gelöscht');
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Alle löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Suche nach Tisch, Produkt, Uhrzeit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Orders List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Keine Bestellungen gefunden</p>
                {searchQuery && (
                  <p className="text-sm">Versuchen Sie eine andere Suche</p>
                )}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {Object.entries(groupedOrders).map(([date, dateOrders]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                      {date}
                    </h3>
                    <div className="space-y-2">
                      {dateOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full bg-muted/50 hover:bg-muted rounded-xl p-3 text-left transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">
                                {getOrderNumber(order)}
                              </span>
                              <span className="text-sm font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(new Date(order.timestamp))}
                              </span>
                              {order.tableName && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Tisch {order.tableName}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                order.serviceType === 'togo' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.serviceType === 'togo' ? 'TO GO' : 'SERVICE'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {order.paymentMethod === 'cash' ? (
                                <Banknote className="w-4 h-4 text-success" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-blue-500" />
                              )}
                              <span className="font-bold">
                                {order.grandTotal.toFixed(2).replace('.', ',')} €
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {order.items.map(item => 
                              `${item.quantity}× ${item.product.name}`
                            ).join(', ')}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Bestellung' : 'Bestellungen'}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Bestellung {getOrderNumber(selectedOrder)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-muted-foreground mb-1">Uhrzeit</div>
                  <div className="font-semibold">
                    {formatTime(new Date(selectedOrder.timestamp))}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-muted-foreground mb-1">Datum</div>
                  <div className="font-semibold">
                    {formatDate(new Date(selectedOrder.timestamp))}
                  </div>
                </div>
                {selectedOrder.tableName && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-muted-foreground mb-1">Tisch</div>
                    <div className="font-semibold">{selectedOrder.tableName}</div>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-muted-foreground mb-1">Typ</div>
                  <div className="font-semibold">
                    {selectedOrder.serviceType === 'togo' ? 'TO GO' : 'SERVICE'}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-muted-foreground mb-1">Zahlung</div>
                  <div className="font-semibold flex items-center gap-1">
                    {selectedOrder.paymentMethod === 'cash' ? (
                      <>
                        <Banknote className="w-4 h-4" /> Bar
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" /> Karte
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-3">Artikel</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span>{item.quantity}× {item.product.name}</span>
                      <span className="font-medium">
                        {(item.product.price * item.quantity).toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                  ))}
                  {selectedOrder.depositTotal !== 0 && (
                    <div className="flex justify-between text-sm text-amber-700 pt-2 border-t">
                      <span>Pfand</span>
                      <span className="font-medium">
                        {selectedOrder.depositTotal >= 0 ? '+' : ''}
                        {selectedOrder.depositTotal.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 mt-3 border-t">
                  <span>Gesamt</span>
                  <span className="text-primary">
                    {selectedOrder.grandTotal.toFixed(2).replace('.', ',')} €
                  </span>
                </div>
                {selectedOrder.amountPaid && selectedOrder.change !== undefined && selectedOrder.change > 0 && (
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Gegeben</span>
                      <span>{selectedOrder.amountPaid.toFixed(2).replace('.', ',')} €</span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>Rückgeld</span>
                      <span>{selectedOrder.change.toFixed(2).replace('.', ',')} €</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full touch-btn-secondary"
              >
                Schließen
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default OrderHistoryDialog;
