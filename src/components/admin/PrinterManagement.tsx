import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Printer as PrinterIcon, Plus, Trash2, TestTube, Pencil, X, Check } from 'lucide-react';
import type { LanPrinter } from '@/types/printer';
import { fetchPrinters, savePrinter, deletePrinterApi, sendTestPrint } from '@/services/printService';

const ROLE_OPTIONS: { value: 'bar' | 'food' | 'combined'; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'food', label: 'Essen' },
  { value: 'combined', label: 'Komplett' },
];

const defaults: Omit<LanPrinter, 'id' | 'displayName' | 'cupsQueue'> = {
  enabled: true,
  assignedRoles: [],
  protocol: 'ESC_POS',
  charsPerLine: 32,
  fontMode: 'DOUBLE_WIDTH',
  codePage: 'PC858',
  replaceEuro: true,
  transliterateGerman: true,
  cutAfterPrint: true,
};

const PrinterManagement = () => {
  const [printers, setPrinters] = useState<LanPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState<Partial<LanPrinter>>({ ...defaults, displayName: '', cupsQueue: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPrinters();
      setPrinters(data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ ...defaults, displayName: '', cupsQueue: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.displayName?.trim() || !form.cupsQueue?.trim()) {
      toast.error('Anzeigename und Queue-Name sind Pflichtfelder');
      return;
    }
    try {
      const printer: LanPrinter = {
        id: editingId || `printer-${Date.now()}`,
        displayName: form.displayName!.trim(),
        cupsQueue: form.cupsQueue!.trim(),
        enabled: form.enabled ?? true,
        assignedRoles: form.assignedRoles ?? [],
        protocol: form.protocol ?? 'ESC_POS',
        charsPerLine: form.charsPerLine ?? 32,
        fontMode: form.fontMode ?? 'DOUBLE_WIDTH',
        codePage: form.codePage ?? 'PC858',
        replaceEuro: form.replaceEuro ?? true,
        transliterateGerman: form.transliterateGerman ?? true,
        cutAfterPrint: form.cutAfterPrint ?? true,
      };
      await savePrinter(printer);
      toast.success(editingId ? 'Drucker aktualisiert' : 'Drucker hinzugefuegt');
      resetForm();
      load();
    } catch {
      toast.error('Speichern fehlgeschlagen – Print-Service offline?');
    }
  };

  const handleDelete = async (p: LanPrinter) => {
    if (!confirm(`Drucker "${p.displayName}" wirklich loeschen?`)) return;
    try {
      await deletePrinterApi(p.id);
      toast.success('Drucker geloescht');
      load();
    } catch {
      toast.error('Loeschen fehlgeschlagen');
    }
  };

  const handleTest = async (p: LanPrinter) => {
    toast.info(`Testdruck an "${p.displayName}"...`);
    const ok = await sendTestPrint(p);
    if (ok) toast.success('Testdruck gesendet');
    else toast.error('Testdruck fehlgeschlagen');
  };

  const startEdit = (p: LanPrinter) => {
    setForm({ ...p });
    setEditingId(p.id);
    setShowForm(true);
  };

  const toggleRole = (role: 'bar' | 'food' | 'combined') => {
    const roles = form.assignedRoles ?? [];
    const has = roles.includes(role);
    setForm({ ...form, assignedRoles: has ? roles.filter((r) => r !== role) : [...roles, role] });
  };

  if (offline && printers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Drucker-Verwaltung</h2>
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-6 text-center">
          <PrinterIcon className="w-12 h-12 mx-auto mb-3 text-destructive opacity-50" />
          <p className="text-lg font-semibold text-destructive">Print-Service offline</p>
          <p className="text-sm text-muted-foreground mt-1">
            Der Print-Service unter <code className="bg-muted px-1 rounded">http://192.168.188.200:3444</code> ist nicht erreichbar.
          </p>
          <button onClick={load} className="touch-btn-secondary mt-4">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Drucker-Verwaltung</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="touch-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Drucker hinzufuegen
        </button>
      </div>

      {offline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-800">
          Print-Service offline – Aenderungen koennen nicht gespeichert werden.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border-2 border-primary/30 p-4 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-lg">{editingId ? 'Drucker bearbeiten' : 'Neuer Drucker'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Anzeigename *</label>
              <input type="text" value={form.displayName ?? ''} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="z.B. Bar-Drucker" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">CUPS Queue *</label>
              <input type="text" value={form.cupsQueue ?? ''} onChange={(e) => setForm({ ...form, cupsQueue: e.target.value })}
                placeholder="z.B. Bar" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Zeichen/Zeile</label>
              <input type="number" value={form.charsPerLine ?? 32} onChange={(e) => setForm({ ...form, charsPerLine: parseInt(e.target.value) || 32 })}
                min={20} max={80} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Schriftmodus</label>
              <select value={form.fontMode ?? 'DOUBLE_WIDTH'} onChange={(e) => setForm({ ...form, fontMode: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="NORMAL">Normal</option>
                <option value="DOUBLE_WIDTH">Doppelte Breite (Standard)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Protokoll</label>
              <select value="ESC_POS" disabled
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm">
                <option>ESC_POS</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Code Page</label>
              <select value="PC858" disabled
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm">
                <option>PC858</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'transliterateGerman' as const, label: 'Umlaute ersetzen (ae/oe/ue)' },
              { key: 'replaceEuro' as const, label: 'EUR statt €' },
              { key: 'cutAfterPrint' as const, label: 'Papier schneiden' },
              { key: 'enabled' as const, label: 'Aktiv' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form[key] ?? true} onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="w-4 h-4 rounded border-border accent-primary" />
                {label}
              </label>
            ))}
          </div>

          {/* Roles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Rollen:</span>
            {ROLE_OPTIONS.map((opt) => {
              const assigned = (form.assignedRoles ?? []).includes(opt.value);
              return (
                <button key={opt.value} onClick={() => toggleRole(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    assigned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="touch-btn-primary text-sm px-4 flex items-center gap-1">
              <Check className="w-4 h-4" /> Speichern
            </button>
            <button onClick={resetForm} className="touch-btn-secondary text-sm px-4 flex items-center gap-1">
              <X className="w-4 h-4" /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Printer List */}
      {loading && printers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Lade Drucker...</div>
      )}

      {!loading && printers.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <PrinterIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Drucker konfiguriert</p>
          <p className="text-sm">Drucker hinzufuegen um den Bondruck zu aktivieren.</p>
        </div>
      )}

      {printers.map((printer) => (
        <div key={printer.id}
          className={`bg-card rounded-xl border-2 p-4 space-y-3 ${printer.enabled ? 'border-border' : 'border-border opacity-60'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <PrinterIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{printer.displayName}</h3>
                {printer.enabled
                  ? <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktiv</span>
                  : <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">Inaktiv</span>}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                Queue: {printer.cupsQueue} · {printer.charsPerLine} Zeichen · {printer.fontMode}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {printer.assignedRoles.map((r) => (
                <span key={r} className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">{r}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <button onClick={() => startEdit(printer)} className="touch-btn-secondary text-sm px-3 py-1.5 min-h-0 flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Bearbeiten
            </button>
            <button onClick={() => handleTest(printer)} className="touch-btn-secondary text-sm px-3 py-1.5 min-h-0 flex items-center gap-1">
              <TestTube className="w-4 h-4" /> Testdruck
            </button>
            <button onClick={() => handleDelete(printer)}
              className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Loeschen
            </button>
          </div>
        </div>
      ))}

      <div className="bg-muted/50 rounded-xl border border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Hinweise:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Drucker werden ueber den Print-Service auf <code>http://192.168.188.200:3444</code> verwaltet.</li>
          <li>CUPS-Queues: <code>Essen</code>, <code>Bar</code>, <code>Hauptkasse</code></li>
          <li>Rollen-Zuordnung bestimmt, welche Drucker beim Bezahlen angesprochen werden.</li>
          <li>Bons enthalten ausschliesslich ASCII-Text (Umlaute werden ersetzt).</li>
          <li>Nach dem Druck wird ein ESC/POS Cut-Befehl gesendet.</li>
        </ul>
      </div>
    </div>
  );
};

export default PrinterManagement;
