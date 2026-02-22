import { useState } from 'react';
import { useAppStore, Category, Product } from '@/store/useAppStore';
import { toast } from 'sonner';
import TableManagement from './TableManagement';
import PrinterManagement from './PrinterManagement';
import DataSyncManagement from './DataSyncManagement';
import BackgroundImageUpload from './BackgroundImageUpload';
import { restoreUmlauts } from '@/lib/searchUtils';

interface AdminScreenProps {
  onLogout: () => void;
}

type AdminTab = 'products' | 'categories' | 'tables' | 'deposit' | 'printers' | 'statistics' | 'sync' | 'design' | 'migration';

const AdminScreen = ({ onLogout }: AdminScreenProps) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('statistics');
  
  const {
    categories,
    products,
    orders,
    depositPerGlass,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    setDepositPerGlass,
    clearOrders,
  } = useAppStore();

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const totalOrders = orders.length;
  const totalDeposit = orders.reduce((sum, order) => sum + order.depositTotal, 0);
  const productsSold: Record<string, number> = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      productsSold[item.product.name] = (productsSold[item.product.name] || 0) + item.quantity;
    });
  });

  const categoryRevenue: Record<string, number> = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const category = categories.find((c) => c.id === item.product.categoryId);
      if (category) {
        categoryRevenue[category.name] = (categoryRevenue[category.name] || 0) + (item.product.price * item.quantity);
      }
    });
  });

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'statistics', label: 'Statistiken' },
    { id: 'products', label: 'Produkte' },
    { id: 'categories', label: 'Kategorien' },
    { id: 'tables', label: 'Tische' },
    { id: 'deposit', label: 'Pfand' },
    { id: 'printers', label: 'Drucker' },
    { id: 'sync', label: 'Synchronisation' },
    { id: 'design', label: 'Design' },
    { id: 'migration', label: 'Migration' },
  ];

  const handleMigrateUmlauts = () => {
    let changedCategories = 0;
    let changedProducts = 0;

    categories.forEach((cat) => {
      const newName = restoreUmlauts(cat.name);
      if (newName !== cat.name) {
        updateCategory(cat.id, { name: newName });
        changedCategories++;
      }
    });

    products.forEach((prod) => {
      const newName = restoreUmlauts(prod.name);
      if (newName !== prod.name) {
        updateProduct(prod.id, { name: newName });
        changedProducts++;
      }
    });

    if (changedCategories === 0 && changedProducts === 0) {
      toast.info('Keine Änderungen nötig – alle Namen enthalten bereits korrekte Umlaute.');
    } else {
      toast.success(`Migration abgeschlossen: ${changedCategories} Kategorien und ${changedProducts} Produkte aktualisiert.`);
    }
  };

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
            <span className="font-display text-xl font-semibold text-blue-600">
              Admin
            </span>
          </div>
          <button
            onClick={onLogout}
            className="touch-btn-secondary text-base py-2 px-4 min-h-0"
          >
            HOME
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-6 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'statistics' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-display text-2xl font-bold text-foreground">Live-Statistiken</h2>
            
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-card-value">{totalRevenue.toFixed(2).replace('.', ',')} €</div>
                <div className="stat-card-label">Gesamtumsatz</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{totalOrders}</div>
                <div className="stat-card-label">Bestellungen</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{totalDeposit.toFixed(2).replace('.', ',')} €</div>
                <div className="stat-card-label">Pfand-Saldo</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2).replace('.', ',') : '0,00'} €
                </div>
                <div className="stat-card-label">Ø Bestellung</div>
              </div>
            </div>

            {/* Category Revenue */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Umsatz nach Kategorien</h3>
              <div className="space-y-3">
                {Object.entries(categoryRevenue)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, revenue]) => (
                    <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="font-medium">{name}</span>
                      <span className="font-semibold text-primary">{revenue.toFixed(2).replace('.', ',')} €</span>
                    </div>
                  ))}
                {Object.keys(categoryRevenue).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Noch keine Verkäufe</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Meistverkaufte Produkte</h3>
              <div className="space-y-3">
                {Object.entries(productsSold)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, quantity]) => (
                    <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="font-medium">{name}</span>
                      <span className="font-semibold text-primary">{quantity}×</span>
                    </div>
                  ))}
                {Object.keys(productsSold).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Noch keine Verkäufe</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button className="touch-btn-secondary" onClick={() => toast.info('Export-Funktion wird implementiert')}>
                CSV Export
              </button>
              <button className="touch-btn-secondary" onClick={() => toast.info('PDF-Funktion wird implementiert')}>
                PDF Export
              </button>
              <button 
                className="touch-btn-destructive"
                onClick={() => {
                  if (confirm('Wirklich alle Bestellungen löschen?')) {
                    clearOrders();
                    toast.success('Bestellungen gelöscht');
                  }
                }}
              >
                Daten zurücksetzen
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-display text-2xl font-bold text-foreground">Pfand-Einstellungen</h2>
            
            <div className="bg-card rounded-xl border border-border p-6 max-w-md">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Pfand pro Glas (€)
              </label>
              <input
                type="number"
                value={depositPerGlass}
                onChange={(e) => setDepositPerGlass(parseFloat(e.target.value) || 0)}
                step="0.50"
                min="0"
                className="numeric-input max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground mt-3">
                Dieser Wert wird für alle Pfandberechnungen verwendet.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tables' && <TableManagement />}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-foreground">Kategorien</h2>
              <button
                onClick={() => {
                  const newCat: Category = {
                    id: `cat-${Date.now()}`,
                    name: 'Neue Kategorie',
                    color: '#722F37', // Default bordeaux color
                    type: 'drinks',
                    sortOrder: categories.length + 1,
                  };
                  addCategory(newCat);
                  toast.success('Kategorie hinzugefügt');
                }}
                className="touch-btn-primary"
              >
                + Kategorie hinzufügen
              </button>
            </div>

            <div className="grid gap-4">
              {categories.map((category) => (
                <div key={category.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                  {/* Color Preview & Picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={category.color.startsWith('#') ? category.color : '#722F37'}
                      onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                      title="Farbe wählen"
                    />
                  </div>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                  />
                  <select
                    value={category.type}
                    onChange={(e) => updateCategory(category.id, { type: e.target.value as 'drinks' | 'food' })}
                    className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                  >
                    <option value="drinks">Getränke</option>
                    <option value="food">Speisen</option>
                  </select>
                  <button
                    onClick={() => {
                      if (confirm('Kategorie und alle zugehörigen Produkte löschen?')) {
                        deleteCategory(category.id);
                        toast.success('Kategorie gelöscht');
                      }
                    }}
                    className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>

            {/* Preset Colors */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Farbvorschläge:</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Bordeaux', color: '#722F37' },
                  { name: 'Weißwein', color: '#D4A84B' },
                  { name: 'Orange', color: '#E67E22' },
                  { name: 'Blau', color: '#3498DB' },
                  { name: 'Grün', color: '#27AE60' },
                  { name: 'Braun', color: '#8B6914' },
                  { name: 'Gelb', color: '#F1C40F' },
                  { name: 'Violett', color: '#9B59B6' },
                  { name: 'Rosa', color: '#E91E63' },
                  { name: 'Türkis', color: '#1ABC9C' },
                ].map((preset) => (
                  <div
                    key={preset.color}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.name}</span>
                    <code className="text-muted-foreground">{preset.color}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-foreground">Produkte</h2>
              <button
                onClick={() => {
                  if (categories.length === 0) {
                    toast.error('Bitte erst eine Kategorie anlegen');
                    return;
                  }
                  const newProd: Product = {
                    id: `prod-${Date.now()}`,
                    name: 'Neues Produkt',
                    price: 0,
                    categoryId: categories[0].id,
                    sortOrder: products.length + 1,
                  };
                  addProduct(newProd);
                  toast.success('Produkt hinzugefügt');
                }}
                className="touch-btn-primary"
              >
                + Produkt hinzufügen
              </button>
            </div>

            {/* Drinks Products */}
            {(() => {
              const drinkCategories = categories.filter(c => c.type === 'drinks');
              const drinkProducts = products.filter(p => 
                drinkCategories.some(c => c.id === p.categoryId)
              );
              
              if (drinkProducts.length === 0) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h3 className="text-lg font-semibold text-primary uppercase tracking-wide">
                      Getränke ({drinkProducts.length})
                    </h3>
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>
                  <div className="grid gap-3">
                    {drinkProducts.map((product) => (
                      <div key={product.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="Produktname"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                            step="0.50"
                            min="0"
                            className="w-24 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none text-right"
                          />
                          <span className="text-muted-foreground">€</span>
                        </div>
                        <select
                          value={product.categoryId}
                          onChange={(e) => updateProduct(product.id, { categoryId: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={product.hasDeposit || false}
                            onChange={(e) => updateProduct(product.id, { hasDeposit: e.target.checked })}
                            className="w-5 h-5 rounded border-border accent-primary"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Pfand</span>
                        </label>
                        <button
                          onClick={() => {
                            if (confirm('Produkt löschen?')) {
                              deleteProduct(product.id);
                              toast.success('Produkt gelöscht');
                            }
                          }}
                          className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Food Products */}
            {(() => {
              const foodCategories = categories.filter(c => c.type === 'food');
              const foodProducts = products.filter(p => 
                foodCategories.some(c => c.id === p.categoryId)
              );
              
              if (foodProducts.length === 0) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <h3 className="text-lg font-semibold text-success uppercase tracking-wide">
                      Speisen ({foodProducts.length})
                    </h3>
                    <div className="flex-1 h-px bg-success/20" />
                  </div>
                  <div className="grid gap-3">
                    {foodProducts.map((product) => (
                      <div key={product.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="Produktname"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                            step="0.50"
                            min="0"
                            className="w-24 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none text-right"
                          />
                          <span className="text-muted-foreground">€</span>
                        </div>
                        <select
                          value={product.categoryId}
                          onChange={(e) => updateProduct(product.id, { categoryId: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (confirm('Produkt löschen?')) {
                              deleteProduct(product.id);
                              toast.success('Produkt gelöscht');
                            }
                          }}
                          className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Uncategorized Products */}
            {(() => {
              const uncategorizedProducts = products.filter(p => 
                !categories.some(c => c.id === p.categoryId)
              );
              
              if (uncategorizedProducts.length === 0) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
                      Ohne Kategorie ({uncategorizedProducts.length})
                    </h3>
                    <div className="flex-1 h-px bg-muted-foreground/20" />
                  </div>
                  <div className="grid gap-3">
                    {uncategorizedProducts.map((product) => (
                      <div key={product.id} className="bg-card rounded-xl border border-destructive/30 p-4 flex items-center gap-4">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                          placeholder="Produktname"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                            step="0.50"
                            min="0"
                            className="w-24 px-3 py-2 rounded-lg border border-border focus:border-primary outline-none text-right"
                          />
                          <span className="text-muted-foreground">€</span>
                        </div>
                        <select
                          value={product.categoryId}
                          onChange={(e) => updateProduct(product.id, { categoryId: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
                        >
                          <option value="">-- Kategorie wählen --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (confirm('Produkt löschen?')) {
                              deleteProduct(product.id);
                              toast.success('Produkt gelöscht');
                            }
                          }}
                          className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {products.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">Noch keine Produkte angelegt</p>
                <p className="text-sm mt-1">Klicken Sie auf "+ Produkt hinzufügen" um zu beginnen.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'printers' && <PrinterManagement />}
        
        {activeTab === 'sync' && <DataSyncManagement />}

        {activeTab === 'design' && <BackgroundImageUpload />}

        {activeTab === 'migration' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-display text-2xl font-bold text-foreground">Umlaut-Migration</h2>
            
            <div className="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-4">
              <p className="text-muted-foreground">
                Diese Funktion konvertiert bestehende Namen von ASCII-Schreibweise (z.B. <code className="bg-muted px-1 rounded">Kaese</code>, <code className="bg-muted px-1 rounded">Gemuese</code>) 
                zu korrekten deutschen Umlauten (<code className="bg-muted px-1 rounded">Käse</code>, <code className="bg-muted px-1 rounded">Gemüse</code>).
              </p>
              <p className="text-sm text-muted-foreground">
                IDs und Referenzen bleiben unverändert. Nur die sichtbaren Namensfelder werden angepasst.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Vorschau – aktuelle Namen:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Kategorien:</span>
                    <ul className="mt-1 space-y-0.5">
                      {categories.map(c => (
                        <li key={c.id} className="flex gap-2">
                          <span>{c.name}</span>
                          {restoreUmlauts(c.name) !== c.name && (
                            <span className="text-primary">→ {restoreUmlauts(c.name)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Produkte (mit Änderungen):</span>
                    <ul className="mt-1 space-y-0.5">
                      {products
                        .filter(p => restoreUmlauts(p.name) !== p.name)
                        .map(p => (
                          <li key={p.id} className="flex gap-2">
                            <span>{p.name}</span>
                            <span className="text-primary">→ {restoreUmlauts(p.name)}</span>
                          </li>
                        ))}
                      {products.filter(p => restoreUmlauts(p.name) !== p.name).length === 0 && (
                        <li className="text-muted-foreground italic">Keine Änderungen nötig</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Umlaut-Migration jetzt durchführen? Namen werden automatisch korrigiert.')) {
                    handleMigrateUmlauts();
                  }
                }}
                className="touch-btn-primary"
              >
                Migration durchführen
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;
