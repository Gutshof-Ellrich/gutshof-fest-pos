/** Shared Raspberry Pi backend URL for all SumUp devices */
export const SUMUP_BASE_URL = 'http://192.168.188.200:3444';

export interface SoloDeviceConfig {
  baseUrl: string;
  deviceKey: string;
  label: string;
}

const SOLO_FOOD: SoloDeviceConfig = {
  baseUrl: SUMUP_BASE_URL,
  deviceKey: 'solo-food',
  label: 'Essen / Komplett',
};

const SOLO_BAR: SoloDeviceConfig = {
  baseUrl: SUMUP_BASE_URL,
  deviceKey: 'solo-bar',
  label: 'Bar',
};

/**
 * Returns the assigned SumUp Solo device config for a given role.
 * Both devices share the same Raspberry Pi backend; they differ by deviceKey.
 */
export function getAssignedSoloDevice(role: string): SoloDeviceConfig | null {
  if (role === 'food' || role === 'combined') return SOLO_FOOD;
  if (role === 'bar') return SOLO_BAR;
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
  device: SoloDeviceConfig
): Promise<{ ok: boolean; clientTransactionId?: string; orderId?: string }> {
  const res = await fetch(`${device.baseUrl}/api/payments/sumup/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      amount,
      description: 'SeliCash Kartenzahlung',
      deviceKey: device.deviceKey,
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
  device: SoloDeviceConfig
): Promise<SumupStatusResponse> {
  const res = await fetch(
    `${device.baseUrl}/api/sumup/checkout-status?orderId=${encodeURIComponent(orderId)}&deviceKey=${encodeURIComponent(device.deviceKey)}`
  );

  if (!res.ok) {
    throw new Error(`SumUp status API error: ${res.status}`);
  }

  return res.json();
}
