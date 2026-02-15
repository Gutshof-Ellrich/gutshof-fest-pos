import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { checkPrinterServer, printTestPage } from '@/services/cupsPrintService';
import type { CupsPrinter } from '@/services/cupsPrintService';
import { toast } from 'sonner';
import { Printer as PrinterIcon, Wifi, WifiOff, TestTube, RefreshCw, Plus, Trash2 } from 'lucide-react';

const ROLE_OPTIONS: { value: 'bar' | 'food' | 'combined'; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'food', label: 'Essen' },
  { value: 'combined', label: 'Komplett' },
];

const PrinterManagement = () => {
  const { cupsPrinters, addCupsPrinter, updateCupsPrinter, deleteCupsPrinter } = useAppStore();
  const [serverStatus, setServerStatus] = useState<Record<string, boolean | null>>({});
  const [checking, setChecking] = useState<string | null>(null);

  // New printer form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formQueue, setFormQueue] = useState('');

  const checkServer = async (printer: CupsPrinter) => {
    setChecking(printer.id);
    const online = await checkPrinterServer(printer.serverUrl);
    setServerStatus((prev) => ({ ...prev, [printer.id]: online }));
    setChecking(null);
  };

  useEffect(() => {
    cupsPrinters.forEach((p) => checkServer(p));
  }, []);

  const handleAddPrinter = () => {
    if (!formName.trim() || !formUrl.trim() || !formQueue.trim()) {
      toast.error('Bitte alle Felder ausfuellen');
      return;
    }
    const newPrinter: CupsPrinter = {
      id: `printer-${Date.now()}`,
      displayName: formName.trim(),
      serverUrl: formUrl.trim().replace(/\/+$/, ''),
      queueName: formQueue.trim(),
      isActive: true,
      assignedRoles: [],
    };
    addCupsPrinter(newPrinter);
    setFormName('');
    setFormUrl('');
    setFormQueue('');
    setShowForm(false);
    toast.success('Drucker hinzugefuegt');
    setTimeout(() => checkServer(newPrinter), 500);
  };

  const handleTestPrint = async (printer: CupsPrinter) => {
    toast.info(`Testdruck an "${printer.displayName}"...`);
    const ok = await printTestPage(printer);
    if (ok) toast.success('Testdruck gesendet');
    else toast.error('Testdruck fehlgeschlagen');
  };

  const toggleRole = (printerId: string, role: 'bar' | 'food' | 'combined') => {
    const printer = cupsPrinters.find((p) => p.id === printerId);
    if (!printer) return;
    const hasRole = printer.assignedRoles.includes(role);
    const newRoles = hasRole
      ? printer.assignedRoles.filter((r) => r !== role)
      : [...printer.assignedRoles, role];
    updateCupsPrinter(printerId, { assignedRoles: newRoles });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Drucker-Verwaltung</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="touch-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Drucker hinzufuegen
        </button>
      </div>

      {/* Add Printer Form */}
      {showForm && (
        <div className="bg-card rounded-xl border-2 border-primary/30 p-4 space-y-3 animate-fade-in">
          <h3 className="font-semibold text-lg">Neuer Drucker</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Anzeigename</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="z.B. Kueche"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Server URL</label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://192.168.188.200:3443"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Queue Name (CUPS)</label>
              <input
                type="text"
                value={formQueue}
                onChange={(e) => setFormQueue(e.target.value)}
                placeholder="z.B. kueche"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddPrinter} className="touch-btn-primary text-sm px-4">
              Speichern
            </button>
            <button onClick={() => setShowForm(false)} className="touch-btn-secondary text-sm px-4">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Printer List */}
      {cupsPrinters.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <PrinterIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Drucker konfiguriert</p>
          <p className="text-sm">Drucker hinzufuegen um den Bondruck zu aktivieren.</p>
        </div>
      )}

      {cupsPrinters.map((printer) => {
        const status = serverStatus[printer.id];
        return (
          <div
            key={printer.id}
            className={`bg-card rounded-xl border-2 p-4 space-y-3 ${
              printer.isActive ? 'border-border' : 'border-border opacity-60'
            }`}
          >
            {/* Printer Header */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <PrinterIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{printer.displayName}</h3>
                  {printer.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktiv</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">Inaktiv</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {printer.serverUrl} / {printer.queueName}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1">
                {status === true && <Wifi className="w-4 h-4 text-green-600" />}
                {status === false && <WifiOff className="w-4 h-4 text-red-600" />}
                {status === null || status === undefined ? (
                  <span className="text-xs text-muted-foreground">--</span>
                ) : null}
              </div>

              {/* Actions */}
              <button
                onClick={() => checkServer(printer)}
                disabled={checking === printer.id}
                className="touch-btn-secondary text-sm px-3 py-1.5 min-h-0"
              >
                <RefreshCw className={`w-4 h-4 ${checking === printer.id ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => handleTestPrint(printer)}
                className="touch-btn-secondary text-sm px-3 py-1.5 min-h-0 flex items-center gap-1"
              >
                <TestTube className="w-4 h-4" />
                Test
              </button>
            </div>

            {/* Role Assignment */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Rollen:</span>
              {ROLE_OPTIONS.map((opt) => {
                const assigned = printer.assignedRoles.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleRole(printer.id, opt.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      assigned
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Toggle Active / Delete */}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <button
                onClick={() => updateCupsPrinter(printer.id, { isActive: !printer.isActive })}
                className="touch-btn-secondary text-sm px-3 py-1.5 min-h-0"
              >
                {printer.isActive ? 'Deaktivieren' : 'Aktivieren'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Drucker "${printer.displayName}" wirklich loeschen?`)) {
                    deleteCupsPrinter(printer.id);
                    toast.success('Drucker geloescht');
                  }
                }}
                className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Loeschen
              </button>
            </div>
          </div>
        );
      })}

      {/* Info */}
      <div className="bg-muted/50 rounded-xl border border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Hinweise:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Jeder Drucker benoetigt einen HTTPS-Proxy oder Print-Relay-Server mit /print und /health Endpunkten.</li>
          <li>Rollen-Zuordnung bestimmt, welche Drucker beim Bezahlen angesprochen werden.</li>
          <li>Ein Drucker kann mehreren Rollen zugeordnet sein.</li>
          <li>Bons enthalten ausschliesslich ASCII-Text ohne Sonderzeichen.</li>
          <li>Nach dem Druck wird ein ESC/POS Cut-Befehl gesendet.</li>
        </ul>
      </div>
    </div>
  );
};

export default PrinterManagement;
