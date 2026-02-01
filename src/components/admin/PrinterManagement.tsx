import { useState, useEffect } from 'react';
import { useAppStore, Printer, Category } from '@/store/useAppStore';
import { printService, printQueue, PrintQueueState } from '@/services/escpos';
import { toast } from 'sonner';
import { Printer as PrinterIcon, Wifi, WifiOff, Settings2, TestTube, Trash2, Plus, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const PrinterManagement = () => {
  const {
    printers,
    categories,
    addPrinter,
    updatePrinter,
    deletePrinter,
    updateCategory,
    orders,
  } = useAppStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [queueState, setQueueState] = useState<PrintQueueState>({ jobs: [], isProcessing: false });
  const [printServerUrl, setPrintServerUrl] = useState(printQueue.getPrintServerUrl() || '');

  // New printer form state
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ipAddress: '',
    port: 9100,
  });

  // Subscribe to print queue updates
  useEffect(() => {
    const unsubscribe = printQueue.subscribe(setQueueState);
    return unsubscribe;
  }, []);

  const handleAddPrinter = () => {
    if (!newPrinter.name.trim() || !newPrinter.ipAddress.trim()) {
      toast.error('Name und IP-Adresse sind erforderlich');
      return;
    }

    const printer: Printer = {
      id: `printer-${Date.now()}`,
      name: newPrinter.name.trim(),
      ipAddress: newPrinter.ipAddress.trim(),
      port: newPrinter.port || 9100,
      isDefault: printers.length === 0,
      isActive: true,
    };

    addPrinter(printer);
    setShowAddDialog(false);
    setNewPrinter({ name: '', ipAddress: '', port: 9100 });
    toast.success(`Drucker "${printer.name}" hinzugefügt`);
  };

  const handleEditPrinter = () => {
    if (!selectedPrinter) return;
    updatePrinter(selectedPrinter.id, selectedPrinter);
    setShowEditDialog(false);
    toast.success(`Drucker "${selectedPrinter.name}" aktualisiert`);
  };

  const handleDeletePrinter = (printer: Printer) => {
    if (!confirm(`Drucker "${printer.name}" wirklich löschen?`)) return;
    
    // Remove printer assignments from categories
    categories.forEach(cat => {
      if (cat.printerId === printer.id) {
        updateCategory(cat.id, { printerId: undefined });
      }
    });
    
    deletePrinter(printer.id);
    toast.success(`Drucker "${printer.name}" gelöscht`);
  };

  const handleTestPrint = async (printer: Printer) => {
    toast.info(`Testdruck an ${printer.name} wird gesendet...`);
    await printService.printTest(printer);
  };

  const handlePrintDailySummary = async () => {
    const defaultPrinter = printers.find(p => p.isDefault && p.isActive) || printers.find(p => p.isActive);
    if (!defaultPrinter) {
      toast.error('Kein aktiver Drucker verfügbar');
      return;
    }
    toast.info('Tagesabschluss wird gedruckt...');
    await printService.printDailySummary(orders, defaultPrinter);
  };

  const handleSetDefault = (printer: Printer) => {
    printers.forEach(p => {
      if (p.isDefault && p.id !== printer.id) {
        updatePrinter(p.id, { isDefault: false });
      }
    });
    updatePrinter(printer.id, { isDefault: true });
    toast.success(`"${printer.name}" ist jetzt Standarddrucker`);
  };

  const handleSavePrintServer = () => {
    const url = printServerUrl.trim();
    printQueue.setPrintServerUrl(url || null);
    setShowServerDialog(false);
    toast.success(url ? 'Print-Server URL gespeichert' : 'Print-Server URL entfernt (Simulation aktiv)');
  };

  const handleCategoryAssignment = (categoryId: string, printerId: string | null) => {
    updateCategory(categoryId, { printerId: printerId || undefined });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'printing': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'retrying': return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Drucker-Verwaltung</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowServerDialog(true)}
            className="touch-btn-secondary flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Server-Einstellungen
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="touch-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Drucker hinzufügen
          </button>
        </div>
      </div>

      {/* Print Server Status */}
      <div className={`rounded-xl border-2 p-4 ${printQueue.getPrintServerUrl() ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          {printQueue.getPrintServerUrl() ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600" />
          )}
          <div className="flex-1">
            <h3 className={`font-semibold ${printQueue.getPrintServerUrl() ? 'text-green-800' : 'text-amber-800'}`}>
              {printQueue.getPrintServerUrl() ? 'Print-Server verbunden' : 'Simulationsmodus'}
            </h3>
            <p className={`text-sm ${printQueue.getPrintServerUrl() ? 'text-green-700' : 'text-amber-700'}`}>
              {printQueue.getPrintServerUrl() 
                ? `Server: ${printQueue.getPrintServerUrl()}`
                : 'Druckaufträge werden simuliert. Konfigurieren Sie einen Print-Server für echten Druck.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Printer List */}
      <div className="grid gap-4">
        {printers.map((printer) => (
          <div
            key={printer.id}
            className={`bg-card rounded-xl border-2 p-4 transition-all ${
              printer.isActive ? 'border-border' : 'border-muted opacity-60'
            } ${printer.isDefault ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${printer.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                <PrinterIcon className={`w-6 h-6 ${printer.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{printer.name}</h3>
                  {printer.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      Standard
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {printer.ipAddress}:{printer.port}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={printer.isActive}
                  onCheckedChange={(checked) => updatePrinter(printer.id, { isActive: checked })}
                />
                <span className="text-sm text-muted-foreground w-12">
                  {printer.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestPrint(printer)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Testdruck"
                >
                  <TestTube className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => {
                    setSelectedPrinter({ ...printer });
                    setShowEditDialog(true);
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <Settings2 className="w-5 h-5 text-muted-foreground" />
                </button>
                {!printer.isDefault && (
                  <button
                    onClick={() => handleSetDefault(printer)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Als Standard setzen"
                  >
                    <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => handleDeletePrinter(printer)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {printers.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-muted">
            <PrinterIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine Drucker konfiguriert</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="touch-btn-primary mt-4"
            >
              Ersten Drucker hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* Category Assignments */}
      {printers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Kategorie-Drucker-Zuordnung</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Weisen Sie Kategorien einem Drucker zu. Nicht zugewiesene Kategorien werden auf dem Standarddrucker gedruckt.
          </p>
          <div className="grid gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full category-${category.color}`} />
                  <span className="font-medium">{category.name}</span>
                  <span className="text-xs text-muted-foreground">({category.type === 'drinks' ? 'Getränke' : 'Speisen'})</span>
                </div>
                <select
                  value={category.printerId || ''}
                  onChange={(e) => handleCategoryAssignment(category.id, e.target.value || null)}
                  className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none min-w-[200px]"
                >
                  <option value="">Standarddrucker</option>
                  {printers.filter(p => p.isActive).map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Queue */}
      {queueState.jobs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Druckwarteschlange</h3>
            <button
              onClick={() => printQueue.clearCompleted()}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Abgeschlossene entfernen
            </button>
          </div>
          <div className="space-y-2">
            {queueState.jobs.slice(0, 10).map((job) => (
              <div key={job.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <span className="font-medium">{job.printerName}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(job.createdAt).toLocaleTimeString('de-DE')}
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  job.status === 'success' ? 'text-green-600' :
                  job.status === 'failed' ? 'text-red-600' :
                  job.status === 'printing' ? 'text-blue-600' :
                  'text-muted-foreground'
                }`}>
                  {job.status === 'pending' && 'Wartend'}
                  {job.status === 'printing' && 'Druckt...'}
                  {job.status === 'success' && 'Erfolgreich'}
                  {job.status === 'failed' && `Fehlgeschlagen (${job.retries}/${job.maxRetries})`}
                  {job.status === 'retrying' && `Wiederholung ${job.retries}/${job.maxRetries}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Print Actions */}
      {printers.some(p => p.isActive) && (
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
      )}

      {/* Add Printer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Drucker hinzufügen</DialogTitle>
            <DialogDescription>
              Geben Sie die Verbindungsdaten für den ESC/POS-Thermodrucker ein.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Druckername</Label>
              <Input
                id="name"
                placeholder="z.B. Bar, Küche, Ausschank"
                value={newPrinter.name}
                onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ip">IP-Adresse</Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={newPrinter.ipAddress}
                onChange={(e) => setNewPrinter({ ...newPrinter, ipAddress: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="9100"
                value={newPrinter.port}
                onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) || 9100 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
            <Button onClick={handleAddPrinter}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Printer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drucker bearbeiten</DialogTitle>
          </DialogHeader>
          {selectedPrinter && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Druckername</Label>
                <Input
                  id="edit-name"
                  value={selectedPrinter.name}
                  onChange={(e) => setSelectedPrinter({ ...selectedPrinter, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-ip">IP-Adresse</Label>
                <Input
                  id="edit-ip"
                  value={selectedPrinter.ipAddress}
                  onChange={(e) => setSelectedPrinter({ ...selectedPrinter, ipAddress: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  value={selectedPrinter.port}
                  onChange={(e) => setSelectedPrinter({ ...selectedPrinter, port: parseInt(e.target.value) || 9100 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Abbrechen</Button>
            <Button onClick={handleEditPrinter}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Server Dialog */}
      <Dialog open={showServerDialog} onOpenChange={setShowServerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print-Server Einstellungen</DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die URL des lokalen Print-Servers. Ohne Server werden Druckaufträge simuliert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="server-url">Print-Server URL</Label>
              <Input
                id="server-url"
                placeholder="http://localhost:3001"
                value={printServerUrl}
                onChange={(e) => setPrintServerUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leer lassen für Simulationsmodus
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h4 className="font-semibold mb-2">Hinweis</h4>
              <p className="text-muted-foreground">
                Webbrowser können nicht direkt mit Netzwerkdruckern kommunizieren. 
                Sie benötigen einen lokalen Print-Server, der HTTP-Anfragen entgegennimmt 
                und diese über TCP/IP an die Drucker weiterleitet.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServerDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSavePrintServer}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrinterManagement;
