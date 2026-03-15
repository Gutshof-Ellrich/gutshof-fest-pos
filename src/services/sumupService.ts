export const LOCAL_BACKEND_URL = 'http://192.168.188.200:3444';

const SUMUP_START_ENDPOINT = `${LOCAL_BACKEND_URL}/api/payments/sumup/start`;
const SUMUP_STATUS_ENDPOINT = `${LOCAL_BACKEND_URL}/api/payments/sumup/status`;

export type SumupPaymentStatus = 'pending' | 'success' | 'error' | 'cancelled';

export async function startSumupPayment(amount: number, orderId: string): Promise<{ ok: boolean }> {
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

export async function pollSumupStatus(orderId: string): Promise<SumupPaymentStatus> {
  const res = await fetch(`${SUMUP_STATUS_ENDPOINT}?orderId=${encodeURIComponent(orderId)}`);

  if (!res.ok) {
    throw new Error(`SumUp status API error: ${res.status}`);
  }

  const data = await res.json();
  // Expect { status: 'pending' | 'success' | 'error' | 'cancelled' }
  return data.status as SumupPaymentStatus;
}
