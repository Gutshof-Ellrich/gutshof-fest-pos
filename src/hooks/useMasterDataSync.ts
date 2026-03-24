import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fetchMasterData, saveMasterData, MasterData } from '@/services/masterDataService';
import { toast } from 'sonner';

const POLL_INTERVAL = 15_000;
const LOCAL_STORAGE_KEY = 'gutshof-weinfest-pos';

function getMasterDataFromStore(): MasterData {
  const s = useAppStore.getState();
  return {
    categories: s.categories,
    products: s.products,
    tables: s.tables,
    depositPerGlass: s.depositPerGlass,
    adminPin: s.adminPin,
    backgroundImage: s.backgroundImage,
  };
}

function applyMasterData(data: MasterData) {
  const s = useAppStore.getState();
  s.setCategories(data.categories);
  s.setProducts(data.products);
  s.setTables(data.tables);
  s.setDepositPerGlass(data.depositPerGlass);
  if (data.adminPin) s.setAdminPin(data.adminPin);
  if (data.backgroundImage !== undefined) s.setBackgroundImage(data.backgroundImage);
}

export function useMasterDataSync() {
  const role = useAppStore((s) => s.currentRole);
  const isAdmin = role === 'admin';
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [serverOnline, setServerOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hashRef = useRef<string>('');

  const loadFromServer = useCallback(async (showErrors = false) => {
    try {
      const data = await fetchMasterData();
      const newHash = JSON.stringify(data);
      if (newHash !== hashRef.current) {
        hashRef.current = newHash;
        applyMasterData(data);
      }
      setServerOnline(true);
    } catch {
      setServerOnline(false);
      if (showErrors) {
        toast.error('Server nicht erreichbar', {
          description: 'Stammdaten konnten nicht geladen werden.',
        });
      }
    }
  }, []);

  // Try to migrate local data on first load if server has no data yet
  const initSync = useCallback(async () => {
    try {
      const serverData = await fetchMasterData();
      // Server has data – apply it
      hashRef.current = JSON.stringify(serverData);
      applyMasterData(serverData);
      setServerOnline(true);
    } catch {
      // Server unreachable or empty – try migration
      try {
        const local = getMasterDataFromStore();
        const hasLocalData = local.categories.length > 0 || local.products.length > 0;
        if (hasLocalData) {
          const saved = await saveMasterData(local);
          hashRef.current = JSON.stringify(saved);
          setServerOnline(true);
          toast.success('Lokale Daten auf Server übertragen');
        }
      } catch {
        setServerOnline(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    initSync();
  }, [initSync]);

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(() => loadFromServer(false), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadFromServer]);

  // Admin save function
  const saveToServer = useCallback(async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const data = getMasterDataFromStore();
      const saved = await saveMasterData(data);
      hashRef.current = JSON.stringify(saved);
      setServerOnline(true);
      toast.success('Stammdaten zentral gespeichert');
    } catch {
      setServerOnline(false);
      toast.error('Speichern fehlgeschlagen', {
        description: 'Server nicht erreichbar.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin]);

  return { serverOnline, isSaving, saveToServer, loadFromServer };
}
