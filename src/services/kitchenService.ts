const API_BASE = 'http://192.168.188.200:3444';

export interface KitchenOrderItem {
  product_name: string;
  qty: number;
  note: string;
}

export interface KitchenOrder {
  id: string;
  order_id: string;
  order_number: string;
  status: 'OPEN' | 'DONE';
  created_at: string;
  done_at: string | null;
  items: KitchenOrderItem[];
}

export interface KitchenSettings {
  enabled: boolean;
  warn_minutes: number;
}

export async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch(`${API_BASE}/api/kitchen/orders`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.orders || [];
}

export async function createKitchenOrder(payload: {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  items: { name: string; qty: number; note: string }[];
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/kitchen/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function markKitchenOrderDone(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/kitchen/order/${id}/done`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchKitchenSettings(): Promise<KitchenSettings> {
  const res = await fetch(`${API_BASE}/api/settings/kitchen`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { enabled: data.enabled, warn_minutes: data.warn_minutes };
}

export async function updateKitchenSettings(
  settings: Partial<KitchenSettings>
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings/kitchen`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
