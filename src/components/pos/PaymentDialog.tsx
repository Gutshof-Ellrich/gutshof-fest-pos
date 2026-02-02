import { useState } from 'react';
import { PaymentMethod, ServiceType, CartItem, DepositInfo } from '@/store/useAppStore';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod, payNow: boolean, amountPaid?: number) => void;
  items: CartItem[];
  deposit: DepositInfo;
  depositPerGlass: number;
  serviceType: ServiceType;
  tableName?: string | null;
  allowPayLater?: boolean;
}

const PaymentDialog = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  deposit,
  depositPerGlass,
  serviceType,
  tableName,
  allowPayLater = false,
}: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [payNow, setPayNow] = useState(true);

  if (!isOpen) return null;

  const itemsTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const depositNew = deposit.newDeposits * depositPerGlass;
  const depositReturn = deposit.returnedDeposits * depositPerGlass;
  const depositSaldo = depositNew - depositReturn;
  const grandTotal = itemsTotal + depositSaldo;
  
  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - grandTotal;

  const quickAmounts = [5, 10, 20, 50];

  const handleConfirm = () => {
    if (payNow && paymentMethod === 'cash' && paidAmount < grandTotal) {
      return;
    }
    onConfirm(paymentMethod, payNow, payNow && paymentMethod === 'cash' ? paidAmount : undefined);
    setAmountPaid('');
    setPaymentMethod('cash');
    setPayNow(true);
  };

  const serviceLabel = serviceType === 'togo' 
    ? 'TO GO' 
    : tableName 
      ? `SERVICE – Tisch ${tableName}`
      : 'SERVICE';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-soft-lg w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-2xl font-bold text-foreground">Zahlung</h2>
          <p className={`mt-1 font-semibold ${serviceType === 'service' ? 'text-primary' : 'text-muted-foreground'}`}>
            {serviceLabel}
          </p>
        </div>

        {/* Order Summary */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between">
                <span>{item.quantity}× {item.product.name}</span>
                <span>{(item.product.price * item.quantity).toFixed(2).replace('.', ',')} €</span>
              </div>
            ))}
            {depositSaldo !== 0 && (
              <div className="flex justify-between pt-2 border-t border-border text-amber-700">
                <span>Pfand-Saldo</span>
                <span>{depositSaldo >= 0 ? '+' : ''}{depositSaldo.toFixed(2).replace('.', ',')} €</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-xl font-bold mt-4 pt-3 border-t border-border">
            <span>Gesamtbetrag:</span>
            <span className="text-primary">{grandTotal.toFixed(2).replace('.', ',')} €</span>
          </div>
        </div>

        {/* Pay Now / Pay Later Toggle for Service Orders */}
        {allowPayLater && serviceType === 'service' && tableName && (
          <div className="p-6 border-b border-border">
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Zahlungszeitpunkt:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayNow(true)}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  payNow
                    ? 'bg-success text-success-foreground ring-2 ring-success'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Sofort zahlen
              </button>
              <button
                onClick={() => setPayNow(false)}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  !payNow
                    ? 'bg-amber-500 text-white ring-2 ring-amber-500'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Später zahlen
              </button>
            </div>
            {!payNow && (
              <p className="mt-3 text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                Die Bestellung wird auf die Rechnung von <strong>Tisch {tableName}</strong> gesetzt.
              </p>
            )}
          </div>
        )}

        {/* Payment Method - Only shown when paying now */}
        {payNow && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Barzahlung
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Kartenzahlung
              </button>
            </div>

            {/* Cash Payment */}
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

                {/* Quick Amount Buttons */}
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
                  onClick={() => setAmountPaid(grandTotal.toFixed(2))}
                  className="w-full py-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold transition-colors"
                >
                  Passend: {grandTotal.toFixed(2).replace('.', ',')} €
                </button>

                {/* Change Display */}
                {paidAmount >= grandTotal && (
                  <div className="p-4 rounded-xl bg-success/10 border-2 border-success/30 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Rückgeld:</span>
                      <span className="text-2xl font-bold text-success">
                        {change.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                  </div>
                )}

                {paidAmount > 0 && paidAmount < grandTotal && (
                  <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30">
                    <p className="text-sm text-destructive font-medium">
                      Betrag zu gering (fehlt: {(grandTotal - paidAmount).toFixed(2).replace('.', ',')} €)
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
        )}

        {/* Actions */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="touch-btn-secondary flex-1"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={payNow && paymentMethod === 'cash' && paidAmount > 0 && paidAmount < grandTotal}
            className={`flex-1 disabled:opacity-50 ${
              payNow ? 'touch-btn-success' : 'bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors'
            }`}
          >
            {payNow ? 'Bezahlt' : 'Auf Rechnung'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDialog;
