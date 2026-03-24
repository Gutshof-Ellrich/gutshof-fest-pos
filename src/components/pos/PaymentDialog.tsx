import { useState, useEffect, useRef, useCallback } from 'react';
import { PaymentMethod, ServiceType, CartItem, DepositInfo } from '@/store/useAppStore';
import {
  startSumupPayment,
  pollSumupCheckoutStatus,
  getAssignedSoloDevice,
  SumupPhase,
  SumupStatusResponse,
} from '@/services/sumupService';
import type { SoloDeviceConfig } from '@/services/sumupService';
import { toast } from 'sonner';

type CardPaymentState = 'idle' | 'starting' | 'polling' | 'final';

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
  role: 'bar' | 'food' | 'combined';
}

const POLL_INTERVAL = 1500;

const phaseIcon: Record<string, string> = {
  waiting_for_card: '💳',
  waiting_for_pin: '🔢',
  waiting_for_signature: '✍️',
  selecting_tip: '💰',
  pending: '⏳',
  success: '✅',
  cancelled: '⚠️',
  failed: '❌',
  reader_offline: '📡',
};

const phaseVariant: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  waiting_for_card: 'info',
  waiting_for_pin: 'info',
  waiting_for_signature: 'info',
  selecting_tip: 'info',
  pending: 'info',
  success: 'success',
  cancelled: 'warning',
  failed: 'error',
  reader_offline: 'error',
};

const variantStyles: Record<string, string> = {
  info: 'bg-primary/10 border-primary/30 text-primary',
  success: 'bg-success/10 border-success/30 text-success',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
};

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
  role,
}: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [payNow, setPayNow] = useState(true);

  // Card payment states
  const [cardState, setCardState] = useState<CardPaymentState>('idle');
  const [clientTransactionId, setClientTransactionId] = useState<string>('');
  const [paymentPhase, setPaymentPhase] = useState<SumupPhase | ''>('');
  const [paymentStatusLabel, setPaymentStatusLabel] = useState<string>('');
  const [canMarkPaid, setCanMarkPaid] = useState(false);
  const [lastPaymentError, setLastPaymentError] = useState<string>('');

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);
  const deviceRef = useRef<SoloDeviceConfig | null>(null);

  const itemsTotal = isOpen ? items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) : 0;
  const depositNew = deposit.newDeposits * depositPerGlass;
  const depositReturn = deposit.returnedDeposits * depositPerGlass;
  const depositSaldo = depositNew - depositReturn;
  const grandTotal = itemsTotal + depositSaldo;

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resetCardState = useCallback(() => {
    stopPolling();
    setCardState('idle');
    setClientTransactionId('');
    setPaymentPhase('');
    setPaymentStatusLabel('');
    setCanMarkPaid(false);
    setLastPaymentError('');
  }, [stopPolling]);

  // Polling loop using chained setTimeout to prevent parallel requests
  const pollStatus = useCallback(
    (txId: string) => {
      if (!isPollingRef.current) return;

      const doPoll = async () => {
        if (!isPollingRef.current) return;
        try {
          const data: SumupStatusResponse = await pollSumupCheckoutStatus(txId, deviceRef.current!);

          if (!isPollingRef.current) return; // stopped while awaiting

          if (!data.ok) {
            setLastPaymentError('Backend meldet Fehler.');
            setPaymentStatusLabel('Statusabfrage fehlgeschlagen');
            // keep polling, might recover
          } else {
            setPaymentPhase(data.ui.phase);
            setPaymentStatusLabel(data.ui.label);
            setCanMarkPaid(data.ui.canMarkPaid);
            setLastPaymentError('');

            if (data.ui.final) {
              isPollingRef.current = false;
              setCardState('final');
              if (data.ui.phase === 'success') {
                toast.success('Kartenzahlung erfolgreich.');
              } else if (data.ui.phase === 'cancelled') {
                toast.error('Kartenzahlung wurde abgebrochen.');
              } else if (data.ui.phase === 'failed') {
                toast.error('Kartenzahlung fehlgeschlagen.');
              }
              return; // don't schedule next poll
            }
          }
          
         } catch (err) {
           console.error('SumUp status poll error:', err);
           if (isPollingRef.current) {
           const message =
            err instanceof Error ? err.message : 'Unbekannter Fehler bei der Statusabfrage';
           setLastPaymentError(`Statusabfrage fehlgeschlagen: ${message}`);
           setPaymentStatusLabel('Statusabfrage fehlgeschlagen');
           }
         }        


        // Schedule next poll if still active
        if (isPollingRef.current) {
          pollingRef.current = setTimeout(doPoll, POLL_INTERVAL);
        }
      };

      // First poll immediately
      doPoll();
    },
    []
  );

  // Cleanup on close/unmount
  useEffect(() => {
    if (!isOpen) {
      resetCardState();
    }
    return () => stopPolling();
  }, [isOpen, resetCardState, stopPolling]);

  if (!isOpen) return null;

  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - grandTotal;
  const quickAmounts = [5, 10, 20, 50];

  const handleSelectCard = async () => {
    setPaymentMethod('card');

    const soloDevice = getAssignedSoloDevice(role);
    if (!soloDevice) {
      // No Solo device assigned for this role — just select card, no terminal flow
      setCanMarkPaid(true);
      setCardState('idle');
      return;
    }

    deviceRef.current = soloDevice;
    setCardState('starting');
    setCanMarkPaid(false);
    setLastPaymentError('');
    setPaymentPhase('');
    setPaymentStatusLabel('Sende Betrag an Kartenterminal...');
    stopPolling();

    const orderId = `order-${Date.now()}`;

    try {
      const result = await startSumupPayment(grandTotal, orderId, soloDevice);
      const txId = result.orderId || result.clientTransactionId || orderId;
      setClientTransactionId(txId);
      setCardState('polling');
      setPaymentStatusLabel('Warte auf Kartenzahlung...');

      // Start polling
      isPollingRef.current = true;
      pollStatus(txId);
    } catch (error) {
      console.error('SumUp payment error:', error);
      setCardState('final');
      setPaymentPhase('failed');
      setPaymentStatusLabel('Kartenzahlung konnte nicht gestartet werden.');
      setLastPaymentError('Bitte Verbindung zum Kassensystem prüfen.');
      toast.error('Kartenzahlung konnte nicht gestartet werden.', {
        description: 'Bitte Verbindung zum Kassensystem prüfen.',
      });
    }
  };

  const handleSelectCash = () => {
    resetCardState();
    setPaymentMethod('cash');
  };

  const handleRetryCard = () => {
    handleSelectCard();
  };

  const handleConfirm = () => {
    if (payNow && paymentMethod === 'cash' && paidAmount > 0 && paidAmount < grandTotal) {
      return;
    }
    if (payNow && paymentMethod === 'card' && !canMarkPaid) {
      return;
    }
    onConfirm(paymentMethod, payNow, payNow && paymentMethod === 'cash' ? paidAmount : undefined);
    setAmountPaid('');
    setPaymentMethod('cash');
    setPayNow(true);
    resetCardState();
  };

  const handleClose = () => {
    resetCardState();
    setPaymentMethod('cash');
    setAmountPaid('');
    setPayNow(true);
    onClose();
  };

  const serviceLabel =
    serviceType === 'togo'
      ? 'TO GO'
      : tableName
        ? `SERVICE – Tisch ${tableName}`
        : 'SERVICE';

  const isConfirmDisabled = (() => {
    if (payNow && paymentMethod === 'card') {
      return !canMarkPaid;
    }
    if (payNow && paymentMethod === 'cash') {
      return paidAmount > 0 && paidAmount < grandTotal;
    }
    return false;
  })();

  const renderCardStatus = () => {
    if (cardState === 'starting') {
      return (
        <div className="flex flex-col items-center gap-3 p-6 animate-fade-in">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-foreground">Sende Betrag an Kartenterminal...</p>
        </div>
      );
    }

    const phase = paymentPhase || 'pending';
    const variant = phaseVariant[phase] || 'info';
    const icon = phaseIcon[phase] || '⏳';
    const styles = variantStyles[variant];
    const isWaiting = ['waiting_for_card', 'waiting_for_pin', 'waiting_for_signature', 'selecting_tip', 'pending'].includes(phase);
    const isFinal = cardState === 'final';
    const showRetry = isFinal && (phase === 'failed' || phase === 'cancelled' || phase === 'reader_offline');

    return (
      <div className="p-6 animate-fade-in space-y-3">
        <div className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${styles}`}>
          <span className="text-3xl">{icon}</span>
          <p className="text-lg font-bold">{paymentStatusLabel}</p>
          {isWaiting && !isFinal && (
            <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin mt-1" />
          )}
          {lastPaymentError && (
            <p className="text-sm opacity-80 mt-1">{lastPaymentError}</p>
          )}
          {phase === 'success' && (
            <p className="text-sm text-muted-foreground mt-1">
              Bitte auf „Bezahlt" klicken um den Vorgang abzuschließen.
            </p>
          )}
        </div>
        {showRetry && (
          <button
            onClick={handleRetryCard}
            className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    );
  };

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
                onClick={handleSelectCash}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Barzahlung
              </button>
              <button
                onClick={handleSelectCard}
                disabled={cardState === 'starting' || cardState === 'polling'}
                className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 ${
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

            {/* Card Payment Status */}
            {paymentMethod === 'card' && renderCardStatus()}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={handleClose}
            className="touch-btn-secondary flex-1"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 disabled:opacity-50 ${
              payNow
                ? 'touch-btn-success'
                : 'bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors'
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
