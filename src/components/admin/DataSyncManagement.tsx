import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { Download, Upload, RefreshCw, Smartphone, Monitor, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ExportData {
  version: string;
  exportedAt: string;
  categories: typeof useAppStore.getState extends () => infer S ? S extends { categories: infer C } ? C : never : never;
  products: typeof useAppStore.getState extends () => infer S ? S extends { products: infer P } ? P : never : never;
  printers: typeof useAppStore.getState extends () => infer S ? S extends { printers: infer R } ? R : never : never;
  tables: typeof useAppStore.getState extends () => infer S ? S extends { tables: infer T } ? T : never : never;
  depositPerGlass: number;
}

const DataSyncManagement = () => {
  const { 
    categories, 
    products, 
    printers, 
    tables, 
    depositPerGlass,
    setCategories,
    setProducts,
    setPrinters,
    setTables,
    setDepositPerGlass,
  } = useAppStore();
  
  const [lastImport, setLastImport] = useState<Date | null>(null);
  const [lastExport, setLastExport] = useState<Date | null>(null);

  const handleExport = () => {
    const exportData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories,
      products,
      printers,
      tables,
      depositPerGlass,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weinfest-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setLastExport(new Date());
    toast.success('Daten erfolgreich exportiert');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportData;
        
        // Validate structure
        if (!data.version || !data.categories || !data.products) {
          throw new Error('Ungültiges Dateiformat');
        }

        // Apply imported data
        if (data.categories) setCategories(data.categories);
        if (data.products) setProducts(data.products);
        if (data.printers) setPrinters(data.printers);
        if (data.tables) setTables(data.tables);
        if (data.depositPerGlass) setDepositPerGlass(data.depositPerGlass);

        setLastImport(new Date());
        toast.success('Daten erfolgreich importiert', {
          description: `${data.categories.length} Kategorien, ${data.products.length} Produkte`,
        });
      } catch (error) {
        toast.error('Import fehlgeschlagen', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const triggerSync = () => {
    // Trigger a storage event for other tabs
    const currentData = localStorage.getItem('gutshof-weinfest-pos');
    if (currentData) {
      // Force a re-save to trigger storage events in other tabs
      localStorage.setItem('gutshof-weinfest-pos', currentData);
      toast.success('Synchronisation angestoßen');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Datensynchronisation
          </CardTitle>
          <CardDescription>
            Synchronisiere Einstellungen zwischen mehreren Geräten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current State */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Aktuelle Daten</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Kategorien</span>
                <span className="text-lg font-semibold">{categories.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Produkte</span>
                <span className="text-lg font-semibold">{products.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Drucker</span>
                <span className="text-lg font-semibold">{printers.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Tische</span>
                <span className="text-lg font-semibold">{tables.length}</span>
              </div>
            </div>
          </div>

          {/* Export/Import Section */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Export */}
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Daten exportieren</h4>
                    <p className="text-sm text-muted-foreground">
                      Erstelle eine Backup-Datei zum Übertragen auf andere Geräte
                    </p>
                  </div>
                  <Button onClick={handleExport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    JSON exportieren
                  </Button>
                  {lastExport && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Zuletzt: {lastExport.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Import */}
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Daten importieren</h4>
                    <p className="text-sm text-muted-foreground">
                      Lade eine Backup-Datei von einem anderen Gerät
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        JSON importieren
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Daten importieren?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Dies überschreibt alle aktuellen Kategorien, Produkte, Drucker und Tisch-Einstellungen. 
                          Bestellungen bleiben erhalten.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <label className="cursor-pointer">
                            Fortfahren
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleImport}
                              className="hidden"
                            />
                          </label>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {lastImport && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Zuletzt: {lastImport.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Sync */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Monitor className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Browser-Tab Synchronisation</h4>
                      <Badge variant="secondary" className="text-xs">Automatisch</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Änderungen werden automatisch zwischen Browser-Tabs auf diesem Gerät synchronisiert.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={triggerSync}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Guide */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Anleitung für mehrere Geräte
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Konfiguriere alle Einstellungen auf dem Hauptgerät (Kategorien, Produkte, Drucker)</li>
              <li>Exportiere die Daten als JSON-Datei</li>
              <li>Übertrage die Datei auf andere Geräte (z.B. per AirDrop, E-Mail, USB)</li>
              <li>Importiere die Datei auf jedem zusätzlichen Gerät</li>
              <li>Wiederhole den Vorgang bei Änderungen an der Konfiguration</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataSyncManagement;
