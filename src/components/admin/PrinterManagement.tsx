import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  checkPrintServer,
  printTestPage,
  printDailySummaryReceipt,
  getPrintServerUrl,
  getPrinterName,
} from '@/services/printService';
import { toast } from 'sonner';
import { Printer as PrinterIcon, Wifi, WifiOff, TestTube, RefreshCw } from 'lucide-react';

const PrinterManagement = () => {
  const { orders } = useAppStore();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkServer = async () => {
    setChecking(true);
    const online = await checkPrintServer();
    setServerOnline(online);
    setChecking(false);
  };

  useEffect(() => {
    checkServer();
  }, []);

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
              Server: {getPrintServerUrl()}
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
          <li>Der Druck erfolgt ueber den Print-Server unter {getPrintServerUrl()}.</li>
          <li>Bons werden automatisch nach Bezahlung gedruckt.</li>
          <li>In Artikelnamen und Bontexten duerfen keine Umlaute oder Sonderzeichen verwendet werden.</li>
        </ul>
      </div>
    </div>
  );
};

export default PrinterManagement;
