const BACKEND_URL = 'http://192.168.188.200:3444';

export interface StatsRoleBreakdown {
  role_name: string;
  orders_count: number;
  total_cents: number;
  cash_cents: number;
  card_cents: number;
  cash_count: number;
  card_count: number;
}

export interface StatsProduct {
  product_name: string;
  category_name: string;
  qty: number;
  revenue_cents: number;
}

export interface StatsHourly {
  hour: number;
  orders_count: number;
  total_cents: number;
  topProducts: { product_name: string; qty: number }[];
}

export interface StatsDaily {
  day: string;
  orders_count: number;
  total_cents: number;
}

export interface DetailedStats {
  ok: boolean;
  totals: {
    orders_count: number;
    total_cents: number;
    deposit_cents: number;
    cash_cents: number;
    card_cents: number;
    cash_count: number;
    card_count: number;
  };
  byRole: StatsRoleBreakdown[];
  topProductsFood: StatsProduct[];
  topProductsDrinks: StatsProduct[];
  allProducts: StatsProduct[];
  hourly: StatsHourly[];
  daily: StatsDaily[];
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export function getDateRange(preset: DatePreset, customFrom?: Date, customTo?: Date): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  };
  const endOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  };

  switch (preset) {
    case 'today':
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { dateFrom: startOfDay(y).toISOString(), dateTo: endOfDay(y).toISOString() };
    }
    case 'last7': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { dateFrom: startOfDay(d).toISOString(), dateTo: endOfDay(now).toISOString() };
    }
    case 'last30': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { dateFrom: startOfDay(d).toISOString(), dateTo: endOfDay(now).toISOString() };
    }
    case 'thisMonth': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: startOfDay(first).toISOString(), dateTo: endOfDay(now).toISOString() };
    }
    case 'lastMonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: startOfDay(first).toISOString(), dateTo: endOfDay(last).toISOString() };
    }
    case 'custom':
      return {
        dateFrom: customFrom ? startOfDay(customFrom).toISOString() : '',
        dateTo: customTo ? endOfDay(customTo).toISOString() : '',
      };
    default:
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };
  }
}

export async function fetchDetailedStats(dateFrom: string, dateTo: string): Promise<DetailedStats> {
  const url = new URL(`${BACKEND_URL}/api/stats/detailed`);
  if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
  if (dateTo) url.searchParams.set('dateTo', dateTo);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Stats-Abfrage fehlgeschlagen (${res.status})`);
  return res.json();
}
