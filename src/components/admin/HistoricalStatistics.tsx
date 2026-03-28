import { useState, useEffect, useCallback } from 'react';
import { fetchDetailedStats, getDateRange, type DetailedStats, type DatePreset } from '@/services/statsService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Clock, Users, ShoppingCart, CreditCard, Banknote, ArrowUpDown, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  bar: 'Bar',
  food: 'Essen',
  combined: 'Komplett',
  unknown: 'Unbekannt',
};

const PRESET_LABELS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Heute' },
  { value: 'yesterday', label: 'Gestern' },
  { value: 'last7', label: 'Letzte 7 Tage' },
  { value: 'last30', label: 'Letzte 30 Tage' },
  { value: 'thisMonth', label: 'Dieser Monat' },
  { value: 'lastMonth', label: 'Letzter Monat' },
  { value: 'custom', label: 'Eigener Zeitraum' },
];

function cents(v: number) {
  return (v / 100).toFixed(2).replace('.', ',') + ' €';
}

const HistoricalStatistics = () => {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [data, setData] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailySortAsc, setDailySortAsc] = useState(false);
  const [expandedHour, setExpandedHour] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange(preset, customFrom, customTo);
      const result = await fetchDetailedStats(dateFrom, dateTo);
      setData(result);
    } catch (err) {
      console.error('[stats] load failed', err);
      toast.error('Statistiken konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    if (preset !== 'custom' || (customFrom && customTo)) {
      loadStats();
    }
  }, [preset, customFrom, customTo, loadStats]);

  const sortedDaily = data?.daily
    ? [...data.daily].sort((a, b) => dailySortAsc ? a.day.localeCompare(b.day) : b.day.localeCompare(a.day))
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Historische Statistik</h2>
        <button onClick={loadStats} disabled={loading} className="touch-btn-secondary flex items-center gap-2 text-sm py-2 px-4 min-h-0">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Aktualisieren
        </button>
      </div>

      {/* Date preset selector */}
      <div className="flex flex-wrap gap-2">
        {PRESET_LABELS.map(p => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              preset === p.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Von:</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  {customFrom ? format(customFrom, 'dd.MM.yyyy') : 'Startdatum'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Bis:</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  {customTo ? format(customTo, 'dd.MM.yyyy') : 'Enddatum'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">Daten werden geladen…</div>
      )}

      {data && !loading && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Gesamtumsatz" value={cents(data.totals.total_cents)} />
            <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Bestellungen" value={String(data.totals.orders_count)} />
            <StatCard icon={<Banknote className="w-5 h-5" />} label="Bar" value={`${cents(data.totals.cash_cents)} (${data.totals.cash_count}×)`} />
            <StatCard icon={<CreditCard className="w-5 h-5" />} label="Karte" value={`${cents(data.totals.card_cents)} (${data.totals.card_count}×)`} />
          </div>

          {/* Role breakdown */}
          <Section title="Umsatz nach Rollen" icon={<Users className="w-5 h-5" />}>
            <div className="grid gap-4 md:grid-cols-3">
              {data.byRole.map(r => (
                <div key={r.role_name} className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <h4 className="font-display font-bold text-lg text-foreground">{ROLE_LABELS[r.role_name] || r.role_name}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Umsatz:</span>
                    <span className="font-semibold text-right">{cents(r.total_cents)}</span>
                    <span className="text-muted-foreground">Bestellungen:</span>
                    <span className="font-semibold text-right">{r.orders_count}</span>
                    <span className="text-muted-foreground">Bar:</span>
                    <span className="font-semibold text-right">{cents(r.cash_cents)} ({r.cash_count}×)</span>
                    <span className="text-muted-foreground">Karte:</span>
                    <span className="font-semibold text-right">{cents(r.card_cents)} ({r.card_count}×)</span>
                  </div>
                </div>
              ))}
              {data.byRole.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-4">Keine Daten</p>}
            </div>
          </Section>

          {/* Top products food */}
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Top Speisen" icon={<TrendingUp className="w-5 h-5" />}>
              <ProductTable products={data.topProductsFood} />
            </Section>
            <Section title="Top Getränke" icon={<TrendingUp className="w-5 h-5" />}>
              <ProductTable products={data.topProductsDrinks} />
            </Section>
          </div>

          {/* All products */}
          <Section title="Alle Produkte" icon={<ShoppingCart className="w-5 h-5" />}>
            <ProductTable products={data.allProducts} showCategory />
          </Section>

          {/* Hourly analysis */}
          <Section title="Stoßzeiten" icon={<Clock className="w-5 h-5" />}>
            <div className="space-y-2">
              {data.hourly.map(h => (
                <div key={h.hour} className="bg-muted/30 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedHour(expandedHour === h.hour ? null : h.hour)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg w-20">{String(h.hour).padStart(2, '0')}:00</span>
                      <span className="text-sm text-muted-foreground">{h.orders_count} Bestellungen</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{cents(h.total_cents)}</span>
                      {expandedHour === h.hour ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {expandedHour === h.hour && h.topProducts.length > 0 && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-xs text-muted-foreground mb-2">Top-Produkte dieser Stunde:</p>
                      <div className="flex flex-wrap gap-2">
                        {h.topProducts.map((p, i) => (
                          <span key={i} className="bg-card border border-border rounded-lg px-3 py-1 text-sm">
                            {p.product_name} <span className="font-semibold text-primary">{p.qty}×</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.hourly.length === 0 && <p className="text-muted-foreground text-center py-4">Keine Daten</p>}
            </div>
          </Section>

          {/* Daily breakdown */}
          <Section title="Tagesübersicht" icon={<CalendarIcon className="w-5 h-5" />}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setDailySortAsc(!dailySortAsc)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowUpDown className="w-4 h-4" />
                {dailySortAsc ? 'Älteste zuerst' : 'Neueste zuerst'}
              </button>
            </div>
            <div className="space-y-2">
              {sortedDaily.map(d => (
                <div key={d.day} className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold">
                      {format(new Date(d.day + 'T00:00:00'), 'EEE, dd.MM.yyyy', { locale: de })}
                    </span>
                    <span className="text-sm text-muted-foreground">{d.orders_count} Bestellungen</span>
                  </div>
                  <span className="font-bold text-primary">{cents(d.total_cents)}</span>
                </div>
              ))}
              {sortedDaily.length === 0 && <p className="text-muted-foreground text-center py-4">Keine Daten</p>}
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat-card flex flex-col items-center gap-2">
      <div className="text-primary">{icon}</div>
      <div className="stat-card-value text-lg">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ProductTable({ products, showCategory }: { products: { product_name: string; category_name?: string; qty: number; revenue_cents: number }[]; showCategory?: boolean }) {
  if (products.length === 0) return <p className="text-muted-foreground text-center py-4">Keine Daten</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-muted-foreground">Produkt</th>
            {showCategory && <th className="text-left py-2 font-medium text-muted-foreground">Kategorie</th>}
            <th className="text-right py-2 font-medium text-muted-foreground">Menge</th>
            <th className="text-right py-2 font-medium text-muted-foreground">Umsatz</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-2 font-medium">{p.product_name}</td>
              {showCategory && <td className="py-2 text-muted-foreground">{p.category_name}</td>}
              <td className="py-2 text-right font-semibold text-primary">{p.qty}×</td>
              <td className="py-2 text-right">{cents(p.revenue_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistoricalStatistics;
