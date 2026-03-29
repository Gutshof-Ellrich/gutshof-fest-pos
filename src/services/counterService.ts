const API_BASE = 'http://192.168.188.200:3444';

export type CounterType = 'togo' | 'service' | 'drink';

export async function fetchNextCounter(type: CounterType): Promise<number> {
  const res = await fetch(`${API_BASE}/api/counters/next/${type}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Counter error: ${res.status}`);
  const data = await res.json();
  return data.value;
}

export async function resetCounterApi(type: CounterType): Promise<void> {
  const res = await fetch(`${API_BASE}/api/counters/reset/${type}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Reset error: ${res.status}`);
}

export async function resetAllCounters(): Promise<void> {
  await Promise.all([
    resetCounterApi('togo'),
    resetCounterApi('service'),
    resetCounterApi('drink'),
  ]);
}

export async function fetchCounterValues(): Promise<Record<CounterType, number>> {
  const res = await fetch(`${API_BASE}/api/counters`);
  if (!res.ok) throw new Error(`Counters error: ${res.status}`);
  const data = await res.json();
  return data.counters;
}
