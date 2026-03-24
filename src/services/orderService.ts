import type { Order } from '@/store/useAppStore';

const LOCAL_BACKEND_URL = 'http://192.168.188.200:3444';
const ORDERS_SAVE_ENDPOINT = `${LOCAL_BACKEND_URL}/api/orders/save`;

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
  console.log('[saveCompletedOrderToBackend] endpoint:', ORDERS_SAVE_ENDPOINT);
  console.log('[saveCompletedOrderToBackend] payload:', payload);

  let response: Response;

  try {
    response = await fetch(ORDERS_SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[saveCompletedOrderToBackend] fetch error:', error);
    throw new Error('Backend konnte nicht erreicht werden');
  }

  console.log('[saveCompletedOrderToBackend] response status:', response.status);

  let text = '';

  try {
    text = await response.text();
  } catch (error) {
    console.error('[saveCompletedOrderToBackend] response read error:', error);
    throw new Error('Serverantwort konnte nicht gelesen werden');
  }

  let data: OrderSaveResponse | null = null;

  try {
    data = text ? JSON.parse(text) as OrderSaveResponse : null;
  } catch (error) {
    console.error('[saveCompletedOrderToBackend] invalid json:', text);
    console.error('[saveCompletedOrderToBackend] json parse error:', error);
    throw new Error('Ungültige Serverantwort');
  }

  if (!response.ok || !data?.ok) {
    console.error('[saveCompletedOrderToBackend] save failed:', {
      status: response.status,
      data,
      rawText: text,
    });
    throw new Error('Die Bestellung konnte nicht gespeichert werden');
  }

  return data;
}
