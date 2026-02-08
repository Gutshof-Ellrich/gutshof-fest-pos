import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  checkPrintServer,
  printTestPage,
  printDailySummaryReceipt,
  getPrinterName,
} from '@/services/printService';
import { toast } from 'sonner';
import { Printer as PrinterIcon, Wifi, WifiOff, TestTube, RefreshCw, Settings } from 'lucide-react';

const PrinterManagement = () => {
  const { orders, printServerUrl, setPrintServerUrl } = useAppStore();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [urlInput, setUrlInput] = useState(printServerUrl);
  const [editingUrl, setEditingUrl] = useState(false);

  const checkServer = async () => {
    setChecking(true);
    const online = await checkPrintServer();
    setServerOnline(online);
    setChecking(false);
  };

  useEffect(() => {
    checkServer();
  }, []);

  useEffect(() => {
    setUrlInput(printServerUrl);
  }, [printServerUrl]);

  const handleTestPrint = async () => {
    toast.info('Testdruck wird gesendet...');
    const success = await printTestPage();
    if (success) {
      toast.success('Testdruck erfolgreich gesendet');
    }
  };

  const handlePrintDailySummary = async () => {
    toast.info('Tagesabschluss wird gedruckt...');
    const success = await printDailySummaryReceipt(orders);
    if (success) {
      toast.success('Tagesabschluss erfolgreich gedruckt');
    }
  };

  const handleSaveUrl = () => {
    const trimmed = urlInput.trim().replace(/\/+$/, '');
    if (!trimmed) {
      toast.error('URL darf nicht leer sein');
      return;
    }
    setPrintServerUrl(trimmed);
    setEditingUrl(false);
    toast.success('Print-Server URL gespeichert');
    // Re-check server with new URL
    setTimeout(checkServer, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Drucker-Verwaltung</h2>
        <button
          onClick={checkServer}
          disabled={checking}
          className="touch-btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Status pruefen
        </button>
      </div>

      {/* Print Server URL Configuration */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Print-Server (HTTPS Proxy)</h3>
        </div>
        {editingUrl ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://192.168.188.200:3443"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono"
            />
            <button onClick={handleSaveUrl} className="touch-btn-primary text-sm px-4">
              Speichern
            </button>
            <button
              onClick={() => { setUrlInput(printServerUrl); setEditingUrl(false); }}
              className="touch-btn-secondary text-sm px-4"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <code className="text-sm bg-muted px-3 py-1.5 rounded-lg font-mono">{printServerUrl}</code>
            <button onClick={() => setEditingUrl(true)} className="touch-btn-secondary text-sm">
              Aendern
            </button>
          </div>
        )}
      </div>

      {/* Print Server Status */}
      <div className={`rounded-xl border-2 p-4 ${
        serverOnline === null
          ? 'bg-muted border-border'
          : serverOnline
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {serverOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className={`w-5 h-5 ${serverOnline === null ? 'text-muted-foreground' : 'text-red-600'}`} />
          )}
          <div className="flex-1">
            <h3 className={`font-semibold ${
              serverOnline === null
                ? 'text-muted-foreground'
                : serverOnline
                  ? 'text-green-800'
                  : 'text-red-800'
            }`}>
              {serverOnline === null
                ? 'Status wird geprueft...'
                : serverOnline
                  ? 'Print-Server verbunden'
                  : 'Print-Server nicht erreichbar'
              }
            </h3>
            <p className={`text-sm ${
              serverOnline === null
                ? 'text-muted-foreground'
                : serverOnline
                  ? 'text-green-700'
                  : 'text-red-700'
            }`}>
              Health-Check: {printServerUrl}/health
            </p>
          </div>
        </div>
      </div>

      {/* Printer Info */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <PrinterIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{getPrinterName()}</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                Standard
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Fest konfigurierter Bondrucker
            </p>
          </div>
          <button
            onClick={handleTestPrint}
            className="touch-btn-secondary flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            Testdruck
          </button>
        </div>
      </div>

      {/* Admin Print Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Admin-Druckfunktionen</h3>
        <div className="flex gap-4">
          <button
            onClick={handlePrintDailySummary}
            className="touch-btn-secondary"
          >
            Tagesabschluss drucken
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-muted/50 rounded-xl border border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Hinweise:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Der Drucker "{getPrinterName()}" ist fest hinterlegt.</li>
          <li>Der Druck erfolgt ueber einen HTTPS-Proxy, der an den Print-Server weiterleitet.</li>
          <li>Bons werden automatisch nach Bezahlung gedruckt.</li>
          <li>In Artikelnamen und Bontexten duerfen keine Umlaute oder Sonderzeichen verwendet werden.</li>
        </ul>

        <p className="font-medium text-foreground mt-4 mb-2">Caddy Proxy einrichten (auf dem Print-Server-Rechner):</p>
        <div className="bg-background rounded-lg p-3 font-mono text-xs whitespace-pre-wrap border border-border">
{`:3443 {
  reverse_proxy 192.168.188.200:3001
  tls internal
}`}
        </div>
        <p className="mt-2">
          Dann Caddy starten: <code className="bg-background px-1.5 py-0.5 rounded border border-border">caddy run --config Caddyfile</code>
        </p>
      </div>
    </div>
  );
};

export default PrinterManagement;
