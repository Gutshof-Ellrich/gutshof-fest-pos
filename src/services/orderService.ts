import { SUMUP_BASE_URL } from './sumupService';
import type { Order } from '@/store/useAppStore';

const API_BASE = SUMUP_BASE_URL;

export interface OrderPayload {
  id: string;
  orderNumber: string;
  orderType: 'togo' | 'table';
  sourceDevice: string;
  roleName: string;
  paymentMethod: 'cash' | 'card';
  paymentStatus: 'successful';
  currency: 'EUR';
  items: {
    productId: string;
    productName: string;
    categoryName: string;
    quantity: number;
    unitPrice: number;
    deposit: number;
    note?: string;
  }[];
  payment: {
    provider?: 'sumup';
    clientTransactionId?: string;
    terminalId?: string;
  };
}

export interface OrderSaveResponse {
  ok: boolean;
  orderId: string;
  totalCents: number;
}

export function buildOrderPayload(
  order: Order,
  categories: { id: string; name: string }[],
  clientTransactionId?: string,
  terminalId?: string,
): OrderPayload {
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  return {
    id: order.id,
    orderNumber: order.togoNumber !== undefined ? `TOGO-${order.togoNumber}` : order.id,
    orderType: order.serviceType === 'togo' ? 'togo' : 'table',
    sourceDevice: navigator.userAgent.substring(0, 64),
    roleName: String(order.role || 'unknown'),
    paymentMethod: order.paymentMethod,
    paymentStatus: 'successful',
    currency: 'EUR',
    items: order.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      categoryName: catMap.get(item.product.categoryId) || '',
      quantity: item.quantity,
      unitPrice: item.product.price,
      deposit: item.product.hasDeposit ? order.deposit.depositValue : 0,
    })),
    payment: order.paymentMethod === 'card'
      ? {
          provider: 'sumup',
          clientTransactionId: clientTransactionId || undefined,
          terminalId: terminalId || undefined,
        }
      : {},
  };
}

export async function saveCompletedOrderToBackend(payload: OrderPayload): Promise<OrderSaveResponse> {
  const res = await fetch(`${API_BASE}/api/orders/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  const data: OrderSaveResponse = await res.json();
  if (!data.ok) {
    throw new Error('Server returned ok: false');
  }

  return data;
}
