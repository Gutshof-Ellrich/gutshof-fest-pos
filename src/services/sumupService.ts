/** Solo device for Essen & Komplett */
export const SOLO_FOOD_URL = 'http://192.168.188.200:3444';

/** Solo device for Bar */
export const SOLO_BAR_URL = 'http://192.168.188.201:3444';

/**
 * Returns the assigned SumUp Solo device for a given role.
 * - 'food' / 'combined' → existing Solo (SOLO_FOOD_URL)
 * - 'bar' → dedicated Bar Solo (SOLO_BAR_URL)
 * - anything else → null (no device)
 */
export function getAssignedSoloDevice(role: string): { url: string } | null {
  if (role === 'food' || role === 'combined') {
    return { url: SOLO_FOOD_URL };
  }
  if (role === 'bar') {
    return { url: SOLO_BAR_URL };
  }
  return null;
}

export type SumupPhase =
  | 'waiting_for_card'
  | 'waiting_for_pin'
  | 'waiting_for_signature'
  | 'selecting_tip'
  | 'pending'
  | 'success'
  | 'cancelled'
  | 'failed'
  | 'reader_offline';

export interface SumupStatusResponse {
  ok: boolean;
  clientTransactionId: string;
  transaction: { status: string };
  reader: { status: string; state: string };
  ui: {
    phase: SumupPhase;
    label: string;
    canMarkPaid: boolean;
    final: boolean;
  };
  diagnostics?: unknown;
}

export async function startSumupPayment(
  amount: number,
  orderId: string,
  baseUrl: string
): Promise<{ ok: boolean; clientTransactionId?: string; orderId?: string }> {
  const res = await fetch(`${baseUrl}/api/payments/sumup/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      amount,
      description: 'SeliCash Kartenzahlung',
    }),
  });

  if (!res.ok) {
    throw new Error(`SumUp API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error('SumUp payment not confirmed');
  }

  return data;
}

export async function pollSumupCheckoutStatus(
  orderId: string,
  baseUrl: string
): Promise<SumupStatusResponse> {
  const res = await fetch(
    `${baseUrl}/api/sumup/checkout-status?orderId=${encodeURIComponent(orderId)}`
  );

  if (!res.ok) {
    throw new Error(`SumUp status API error: ${res.status}`);
  }

  return res.json();
}
