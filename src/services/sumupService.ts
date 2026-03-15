export const LOCAL_BACKEND_URL = 'http://192.168.188.200:3444';

const SUMUP_ENDPOINT = `${LOCAL_BACKEND_URL}/api/payments/sumup/start`;

export async function startSumupPayment(amount: number, orderId: string): Promise<{ ok: boolean }> {
  const res = await fetch(SUMUP_ENDPOINT, {
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
