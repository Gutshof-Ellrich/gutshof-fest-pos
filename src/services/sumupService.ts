export const LOCAL_BACKEND_URL = 'http://192.168.188.200:3444';

const SUMUP_START_ENDPOINT = `${LOCAL_BACKEND_URL}/api/payments/sumup/start`;
const SUMUP_STATUS_ENDPOINT = `${LOCAL_BACKEND_URL}/api/sumup/checkout-status`;

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
  orderId: string
): Promise<{ ok: boolean; clientTransactionId?: string; orderId?: string }> {
  const res = await fetch(SUMUP_START_ENDPOINT, {
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
  orderId: string
): Promise<SumupStatusResponse> {
  const res = await fetch(
    `${SUMUP_STATUS_ENDPOINT}?orderId=${encodeURIComponent(orderId)}`
  );

  if (!res.ok) {
    throw new Error(`SumUp status API error: ${res.status}`);
  }

  return res.json();
}
