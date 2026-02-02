import { useState } from 'react';
import { useAppStore, PaymentMethod, TableTab } from '@/store/useAppStore';
import { Clock, CreditCard, Banknote, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OpenTablesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const OpenTablesPanel = ({ isOpen, onClose }: OpenTablesPanelProps) => {
  const { tableTabs, settleTableTab, depositPerGlass } = useAppStore();
  const [selectedTab, setSelectedTab] = useState<TableTab | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');

  const quickAmounts = [10, 20, 50, 100];

  const handleSettleTab = () => {
    if (!selectedTab) return;
    
    const paidAmount = parseFloat(amountPaid) || 0;
    
    if (paymentMethod === 'cash' && paidAmount < selectedTab.totalAmount) {
      return;
    }
    
    settleTableTab(
      selectedTab.tableId, 
      paymentMethod, 
      paymentMethod === 'cash' ? paidAmount : undefined
    );
    
    setSelectedTab(null);
    setAmountPaid('');
    setPaymentMethod('cash');
  };

  const paidAmount = parseFloat(amountPaid) || 0;
  const change = selectedTab ? paidAmount - selectedTab.totalAmount : 0;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Offene Tische ({tableTabs.length})
          </DialogTitle>
        </DialogHeader>

        {tableTabs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Keine offenen Tische</p>
              <p className="text-sm">Alle Bestellungen wurden bezahlt.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {tableTabs.map((tab) => (
              <button
                key={tab.tableId}
                onClick={() => setSelectedTab(tab)}
                className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-left hover:border-amber-400 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-amber-800">
                    Tisch {tab.tableName}
                  </span>
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    {tab.orders.length} Best.
                  </span>
                </div>
                <div className="text-xl font-bold text-amber-900">
                  {tab.totalAmount.toFixed(2).replace('.', ',')} €
                </div>
                <div className="text-xs text-amber-600 mt-2">
                  Seit {formatTime(tab.createdAt)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Payment Dialog for Selected Tab */}
        {selectedTab && (
          <Dialog open={!!selectedTab} onOpenChange={(open) => !open && setSelectedTab(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Tisch {selectedTab.tableName} abrechnen
                </DialogTitle>
              </DialogHeader>

              {/* Order Summary */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                {selectedTab.orders.map((order) => (
                  <div key={order.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{formatTime(new Date(order.timestamp))}</span>
                      <span>{order.items.length} Artikel</span>
                    </div>
                    {order.items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.product.name}</span>
                        <span>{(item.product.price * item.quantity).toFixed(2).replace('.', ',')} €</span>
                      </div>
                    ))}
                    {order.depositTotal !== 0 && (
                      <div className="flex justify-between text-sm text-amber-700">
                        <span>Pfand</span>
                        <span>{order.depositTotal >= 0 ? '+' : ''}{order.depositTotal.toFixed(2).replace('.', ',')} €</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                  <span>Gesamtbetrag:</span>
                  <span className="text-primary">{selectedTab.totalAmount.toFixed(2).replace('.', ',')} €</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'cash'
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    Bar
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'card'
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Karte
                  </button>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Gezahlter Betrag:
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0,00"
                        className="numeric-input"
                        step="0.01"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setAmountPaid(amount.toString())}
                          className="py-3 rounded-lg bg-muted hover:bg-muted/80 font-semibold transition-colors"
                        >
                          {amount} €
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setAmountPaid(selectedTab.totalAmount.toFixed(2))}
                      className="w-full py-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold transition-colors"
                    >
                      Passend: {selectedTab.totalAmount.toFixed(2).replace('.', ',')} €
                    </button>

                    {paidAmount >= selectedTab.totalAmount && (
                      <div className="p-4 rounded-xl bg-success/10 border-2 border-success/30 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium">Rückgeld:</span>
                          <span className="text-2xl font-bold text-success">
                            {change.toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                      </div>
                    )}

                    {paidAmount > 0 && paidAmount < selectedTab.totalAmount && (
                      <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30">
                        <p className="text-sm text-destructive font-medium">
                          Betrag zu gering (fehlt: {(selectedTab.totalAmount - paidAmount).toFixed(2).replace('.', ',')} €)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-6 text-center text-muted-foreground animate-fade-in">
                    <p className="text-lg">Bitte Kartenzahlung am Terminal durchführen</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedTab(null)}
                  className="touch-btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSettleTab}
                  disabled={paymentMethod === 'cash' && paidAmount > 0 && paidAmount < selectedTab.totalAmount}
                  className="touch-btn-success flex-1 disabled:opacity-50"
                >
                  Bezahlt
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OpenTablesPanel;
