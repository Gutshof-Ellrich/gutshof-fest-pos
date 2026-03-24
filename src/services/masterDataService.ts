import { SUMUP_BASE_URL } from './sumupService';
import type { Category, Product, Table } from '@/store/useAppStore';

const API_BASE = SUMUP_BASE_URL; // same Raspberry Pi

export interface MasterData {
  categories: Category[];
  products: Product[];
  tables: Table[];
  depositPerGlass: number;
  adminPin: string;
  backgroundImage: string | null;
}

export async function fetchMasterData(): Promise<MasterData> {
  const res = await fetch(`${API_BASE}/api/masterdata`);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

export async function saveMasterData(data: MasterData): Promise<MasterData> {
  const res = await fetch(`${API_BASE}/api/masterdata`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}
