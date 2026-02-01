import { useState } from 'react';
import { useAppStore, Table } from '@/store/useAppStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

const TableManagement = () => {
  const { tables, addTable, updateTable, deleteTable } = useAppStore();
  const [newTableName, setNewTableName] = useState('');

  const handleAddTable = () => {
    const name = newTableName.trim();
    if (!name) {
      toast.error('Bitte einen Tischnamen eingeben');
      return;
    }
    
    const newTable: Table = {
      id: `table-${Date.now()}`,
      name,
      isActive: true,
      sortOrder: tables.length + 1,
    };
    
    addTable(newTable);
    setNewTableName('');
    toast.success(`Tisch "${name}" hinzugefügt`);
  };

  const handleQuickAdd = () => {
    // Find the next available number
    const existingNumbers = tables
      .map(t => parseInt(t.name))
      .filter(n => !isNaN(n));
    
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    const newTable: Table = {
      id: `table-${Date.now()}`,
      name: String(nextNumber),
      isActive: true,
      sortOrder: tables.length + 1,
    };
    
    addTable(newTable);
    toast.success(`Tisch ${nextNumber} hinzugefügt`);
  };

  const sortedTables = [...tables].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Tischverwaltung</h2>
        <div className="flex gap-2">
          <button
            onClick={handleQuickAdd}
            className="touch-btn-secondary"
          >
            + Nächste Nummer
          </button>
        </div>
      </div>

      {/* Add New Table */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-foreground mb-3">Neuen Tisch hinzufügen</h3>
        <div className="flex gap-3">
          <Input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Tischnummer oder Name (z.B. 5 oder VIP-Bereich)"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
          />
          <button
            onClick={handleAddTable}
            className="touch-btn-primary"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Tables List */}
      <div className="grid gap-3">
        {sortedTables.map((table) => (
          <div 
            key={table.id} 
            className={`bg-card rounded-xl border p-4 flex items-center gap-4 transition-all ${
              table.isActive 
                ? 'border-border' 
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
              table.isActive 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {table.name.length <= 3 ? table.name : table.name.substring(0, 2)}
            </div>
            
            <Input
              type="text"
              value={table.name}
              onChange={(e) => updateTable(table.id, { name: e.target.value })}
              className="flex-1 max-w-[200px]"
            />
            
            <button
              onClick={() => updateTable(table.id, { isActive: !table.isActive })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                table.isActive
                  ? 'bg-success/10 text-success hover:bg-success/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {table.isActive ? 'Aktiv' : 'Inaktiv'}
            </button>
            
            <button
              onClick={() => {
                if (confirm(`Tisch "${table.name}" wirklich löschen?`)) {
                  deleteTable(table.id);
                  toast.success(`Tisch "${table.name}" gelöscht`);
                }
              }}
              className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              Löschen
            </button>
          </div>
        ))}
        
        {tables.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Noch keine Tische angelegt</p>
            <p className="text-sm">Fügen Sie Tische hinzu, um sie bei Service-Bestellungen auswählen zu können.</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Hinweis zur Tischverwaltung</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Aktive Tische stehen bei Service-Bestellungen zur Auswahl</li>
          <li>• Inaktive Tische werden ausgeblendet, aber nicht gelöscht</li>
          <li>• Die Tischnummer wird auf allen Bons und Küchendrucken angezeigt</li>
          <li>• ToGo-Bestellungen benötigen keine Tischauswahl</li>
        </ul>
      </div>
    </div>
  );
};

export default TableManagement;
