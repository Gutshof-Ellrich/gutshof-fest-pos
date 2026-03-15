const SUMUP_API_URL = 'http://127.0.0.1:3444/api/payments/sumup/start';

export async function startSumupPayment(amount: number, orderId: string): Promise<{ ok: boolean }> {
  const res = await fetch(SUMUP_API_URL, {
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
