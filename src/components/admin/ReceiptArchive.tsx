import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Archive, Printer, Trash2, Search, RefreshCw } from 'lucide-react';
import type { ArchivedReceipt } from '@/types/printer';
import {
  fetchReceipts, deleteAllReceipts, reprintReceipt,
  getArchiveEnabled, setArchiveEnabled,
} from '@/services/printService';

const ReceiptArchive = () => {
  const [receipts, setReceipts] = useState<ArchivedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [archiveActive, setArchiveActive] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<ArchivedReceipt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enabled, data] = await Promise.all([
        getArchiveEnabled(),
        fetchReceipts({
          ...(dateFrom && { from: dateFrom }),
          ...(dateTo && { to: dateTo }),
          ...(roleFilter && { role: roleFilter }),
          ...(typeFilter && { type: typeFilter }),
          ...(search && { q: search }),
        }),
      ]);
      setArchiveActive(enabled);
      setReceipts(data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, roleFilter, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggleArchive = async () => {
    try {
      await setArchiveEnabled(!archiveActive);
      setArchiveActive(!archiveActive);
      toast.success(archiveActive ? 'Bon-Archiv deaktiviert' : 'Bon-Archiv aktiviert');
    } catch {
      toast.error('Einstellung konnte nicht gespeichert werden');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Wirklich das gesamte Bon-Archiv loeschen?')) return;
    try {
      await deleteAllReceipts();
      setReceipts([]);
      toast.success('Archiv geloescht');
    } catch {
      toast.error('Loeschen fehlgeschlagen');
    }
  };

  const handleReprint = async (r: ArchivedReceipt) => {
    try {
      await reprintReceipt(r.id);
      toast.success('Bon erneut gedruckt');
    } catch {
      toast.error('Nachdruck fehlgeschlagen');
    }
  };

  if (offline) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Bon-Archiv</h2>
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-6 text-center">
          <Archive className="w-12 h-12 mx-auto mb-3 text-destructive opacity-50" />
          <p className="text-lg font-semibold text-destructive">Print-Service offline</p>
          <p className="text-sm text-muted-foreground mt-1">Bon-Archiv nicht verfuegbar.</p>
          <button onClick={load} className="touch-btn-secondary mt-4">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Bon-Archiv</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-muted-foreground">Archiv aktiv</span>
            <button onClick={toggleArchive}
              className={`relative w-12 h-6 rounded-full transition-colors ${archiveActive ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${archiveActive ? 'left-6' : 'left-0.5'}`} />
            </button>
          </label>
          <button onClick={handleDeleteAll} className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Archiv loeschen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Von</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Bis</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Rolle</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm">
            <option value="">Alle</option>
            <option value="bar">Bar</option>
            <option value="food">Essen</option>
            <option value="combined">Komplett</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm">
            <option value="">Alle</option>
            <option value="SERVICE">Service</option>
            <option value="TOGO">ToGo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Suche</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tisch, Artikel..." className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-border bg-background text-sm" />
          </div>
        </div>
      </div>

      {/* Receipt List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Bons...</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Bons im Archiv</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => {
            const ts = new Date(r.timestamp);
            return (
              <div key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                className="bg-card rounded-xl border border-border p-3 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">
                      {ts.toLocaleDateString('de-DE')} {ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.serviceType === 'TOGO' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.serviceType === 'TOGO' && r.togoNumber !== undefined ? `TOGO ${r.togoNumber}` : r.serviceType}
                    </span>
                    {r.tableNumber && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Tisch {r.tableNumber}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{r.role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{r.totals.grandTotal.toFixed(2).replace('.', ',')} EUR</span>
                    <span className="text-xs text-muted-foreground">{r.payment.method}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleReprint(r); }}
                      className="touch-btn-secondary text-xs px-2 py-1 min-h-0 flex items-center gap-1">
                      <Printer className="w-3 h-3" /> Nachdruck
                    </button>
                  </div>
                </div>

                {/* Detail */}
                {selected?.id === r.id && (
                  <div className="mt-3 pt-3 border-t border-border text-sm space-y-1 animate-fade-in">
                    {r.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        <span>{item.lineTotal.toFixed(2).replace('.', ',')} EUR</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border flex justify-between font-semibold">
                      <span>Gesamt</span>
                      <span>{r.totals.grandTotal.toFixed(2).replace('.', ',')} EUR</span>
                    </div>
                    {r.printers.length > 0 && (
                      <p className="text-xs text-muted-foreground pt-1">Gedruckt auf: {r.printers.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReceiptArchive;
