import { useState } from 'react';
import { CartItem, DepositInfo, ServiceType, Table } from '@/store/useAppStore';
import TableSelector from './TableSelector';

interface CartPanelProps {
  items: CartItem[];
  deposit: DepositInfo;
  serviceType: ServiceType;
  depositPerGlass: number;
  selectedTableId: string | null;
  selectedTableName: string | null;
  tables: Table[];
  showDeposit?: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSetNewDeposits: (count: number) => void;
  onSetReturnedDeposits: (count: number) => void;
  onSetServiceType: (type: ServiceType) => void;
  onSelectTable: (tableId: string | null, tableName: string | null) => void;
  onCheckout: () => void;
  onClearCart: () => void;
}

const CartPanel = ({
  items,
  deposit,
  serviceType,
  depositPerGlass,
  selectedTableId,
  selectedTableName,
  tables,
  showDeposit = true,
  onUpdateQuantity,
  onRemoveItem,
  onSetNewDeposits,
  onSetReturnedDeposits,
  onSetServiceType,
  onSelectTable,
  onCheckout,
  onClearCart,
}: CartPanelProps) => {
  const [showTableSelector, setShowTableSelector] = useState(false);

  const itemsTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const depositNew = showDeposit ? deposit.newDeposits * depositPerGlass : 0;
  const depositReturn = showDeposit ? deposit.returnedDeposits * depositPerGlass : 0;
  const depositSaldo = depositNew - depositReturn;
  const grandTotal = itemsTotal + depositSaldo;

  const activeTables = tables.filter(t => t.isActive);
  const hasActiveTables = activeTables.length > 0;

  const handleQuantityChange = (productId: string, delta: number, currentQuantity: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      onRemoveItem(productId);
    } else {
      onUpdateQuantity(productId, newQuantity);
    }
  };

  const handleServiceTypeChange = (type: ServiceType) => {
    onSetServiceType(type);
    // Clear table selection when switching to ToGo
    if (type === 'togo') {
      onSelectTable(null, null);
    }
  };

  const handleTableSelect = (tableId: string, tableName: string) => {
    onSelectTable(tableId, tableName);
  };

  // Check if checkout is allowed
  const canCheckout = () => {
    const hasItems = items.length > 0 || depositSaldo !== 0;
    if (!hasItems) return false;
    
    // For service orders, table is required if tables exist
    if (serviceType === 'service' && hasActiveTables && !selectedTableId) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft h-full flex flex-col">
      {/* Header */}
      <div className="p-2 md:p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-base md:text-xl font-semibold text-foreground">Warenkorb</h2>
        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs md:text-sm text-destructive hover:underline"
          >
            Leeren
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-16 md:h-32 text-muted-foreground">
            <p className="text-sm md:text-base">Keine Artikel im Warenkorb</p>
          </div>
        ) : (
          <div className="space-y-1 md:space-y-2">
            {items.map((item) => (
              <div key={item.product.id} className="cart-item p-1.5 md:p-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm md:text-base truncate">{item.product.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {item.product.price.toFixed(2).replace('.', ',')} € × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => handleQuantityChange(item.product.id, -1, item.quantity)}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-base md:text-lg"
                  >
                    −
                  </button>
                  <span className="w-6 md:w-8 text-center font-semibold text-sm md:text-base">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.product.id, 1, item.quantity)}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-base md:text-lg"
                  >
                    +
                  </button>
                </div>
                <div className="w-16 md:w-20 text-right font-semibold text-foreground text-sm md:text-base">
                  {(item.product.price * item.quantity).toFixed(2).replace('.', ',')} €
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deposit Section - Only visible for bar role */}
        {showDeposit && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-800">Pfand</h3>
              <span className="text-sm text-amber-700">
                {depositPerGlass.toFixed(2).replace('.', ',')} € / Glas
              </span>
            </div>
            
            {/* New Deposits */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-amber-800">Neue Gläser:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSetNewDeposits(Math.max(0, deposit.newDeposits - 1))}
                  className="w-10 h-10 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  value={deposit.newDeposits}
                  onChange={(e) => onSetNewDeposits(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-10 text-center rounded-lg border border-amber-300 font-semibold"
                />
                <button
                  onClick={() => onSetNewDeposits(deposit.newDeposits + 1)}
                  className="w-10 h-10 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Returned Deposits */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-amber-800">Zurückgegebene Gläser:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSetReturnedDeposits(Math.max(0, deposit.returnedDeposits - 1))}
                  className="w-10 h-10 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  value={deposit.returnedDeposits}
                  onChange={(e) => onSetReturnedDeposits(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-10 text-center rounded-lg border border-amber-300 font-semibold"
                />
                <button
                  onClick={() => onSetReturnedDeposits(deposit.returnedDeposits + 1)}
                  className="w-10 h-10 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Deposit Summary */}
            <div className="pt-3 border-t border-amber-300 space-y-1 text-sm">
              <div className="flex justify-between text-amber-800">
                <span>Pfand neu:</span>
                <span>+{depositNew.toFixed(2).replace('.', ',')} €</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Pfand zurück:</span>
                <span>−{depositReturn.toFixed(2).replace('.', ',')} €</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900">
                <span>Pfand-Saldo:</span>
                <span className={depositSaldo < 0 ? 'text-green-700' : ''}>
                  {depositSaldo >= 0 ? '+' : ''}{depositSaldo.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Type Toggle */}
      <div className="p-2 md:p-4 border-t border-border">
        <label className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2 block">Service-Art:</label>
        <div className="service-toggle">
          <button
            onClick={() => handleServiceTypeChange('service')}
            className={`service-toggle-option text-xs md:text-sm py-2 md:py-3 ${
              serviceType === 'service' ? 'service-toggle-option-active' : 'service-toggle-option-inactive'
            }`}
          >
            SERVICE
          </button>
          <button
            onClick={() => handleServiceTypeChange('togo')}
            className={`service-toggle-option text-xs md:text-sm py-2 md:py-3 ${
              serviceType === 'togo' ? 'service-toggle-option-active' : 'service-toggle-option-inactive'
            }`}
          >
            TO GO
          </button>
        </div>

        {/* Table Selection for Service Orders */}
        {serviceType === 'service' && hasActiveTables && (
          <div className="mt-2 md:mt-3">
            <button
              onClick={() => setShowTableSelector(true)}
              className={`w-full py-2 md:py-3 px-3 md:px-4 rounded-xl font-semibold text-sm md:text-lg transition-all flex items-center justify-center gap-1 md:gap-2 ${
                selectedTableId
                  ? 'bg-primary/10 text-primary border-2 border-primary'
                  : 'bg-destructive/10 text-destructive border-2 border-destructive animate-pulse'
              }`}
            >
              {selectedTableId ? (
                <>
                  <span>Tisch {selectedTableName}</span>
                  <span className="text-xs md:text-sm opacity-70">(ändern)</span>
                </>
              ) : (
                '⚠ Tisch auswählen (Pflicht)'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Totals & Checkout */}
      <div className="p-2 md:p-4 border-t border-border bg-muted/50 rounded-b-2xl">
        <div className="space-y-1 md:space-y-2 mb-2 md:mb-4">
          <div className="flex justify-between text-xs md:text-sm">
            <span className="text-muted-foreground">Artikel:</span>
            <span>{itemsTotal.toFixed(2).replace('.', ',')} €</span>
          </div>
          {depositSaldo !== 0 && (
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Pfand-Saldo:</span>
              <span>{depositSaldo >= 0 ? '+' : ''}{depositSaldo.toFixed(2).replace('.', ',')} €</span>
            </div>
          )}
          {serviceType === 'service' && selectedTableName && (
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Tisch:</span>
              <span className="font-semibold text-primary">{selectedTableName}</span>
            </div>
          )}
          <div className="flex justify-between text-base md:text-xl font-bold pt-1 md:pt-2 border-t border-border">
            <span>Gesamt:</span>
            <span className="text-primary">{grandTotal.toFixed(2).replace('.', ',')} €</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={!canCheckout()}
          className="touch-btn-success w-full py-2 md:py-3 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {serviceType === 'service' && hasActiveTables && !selectedTableId 
            ? 'Bitte Tisch wählen' 
            : 'Zur Kasse'}
        </button>
      </div>

      {/* Table Selector Dialog */}
      <TableSelector
        isOpen={showTableSelector}
        onClose={() => setShowTableSelector(false)}
        onSelectTable={handleTableSelect}
        selectedTableId={selectedTableId}
      />
    </div>
  );
};

export default CartPanel;
