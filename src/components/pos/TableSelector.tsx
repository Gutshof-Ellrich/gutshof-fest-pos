import { useAppStore } from '@/store/useAppStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TableSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string, tableName: string) => void;
  selectedTableId?: string | null;
}

const TableSelector = ({ isOpen, onClose, onSelectTable, selectedTableId }: TableSelectorProps) => {
  const { tables } = useAppStore();
  
  const activeTables = tables
    .filter(t => t.isActive)
    .sort((a, b) => {
      // Sort numerically if both are numbers, otherwise alphabetically
      const aNum = parseInt(a.name);
      const bNum = parseInt(b.name);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.name.localeCompare(b.name);
    });

  const handleSelect = (table: { id: string; name: string }) => {
    onSelectTable(table.id, table.name);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Tisch auswählen</DialogTitle>
        </DialogHeader>
        
        {activeTables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg mb-2">Keine aktiven Tische verfügbar</p>
            <p className="text-sm">Bitte legen Sie im Admin-Bereich Tische an.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 py-4">
            {activeTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleSelect(table)}
                className={`
                  aspect-square rounded-xl font-bold text-xl
                  flex items-center justify-center
                  transition-all duration-150 active:scale-95
                  ${selectedTableId === table.id
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                  }
                `}
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                {table.name}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TableSelector;
