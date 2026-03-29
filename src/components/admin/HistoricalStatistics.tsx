import { useState, useEffect, useCallback } from 'react';
import { fetchDetailedStats, getDateRange, type DetailedStats, type DatePreset } from '@/services/statsService';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon, TrendingUp, Clock, Users, ShoppingCart, CreditCard,
  Banknote, ChevronDown, ChevronUp, RefreshCw, UtensilsCrossed, ArrowUpDown, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  bar: 'Bar', Bar: 'Bar',
  food: 'Essen', Essen: 'Essen',
  combined: 'Komplett', Komplett: 'Komplett',
  unknown: 'Unbekannt', Unbekannt: 'Unbekannt',
};

const PRESET_LABELS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Heute' },
  { value: 'yesterday', label: 'Gestern' },
  { value: 'thisWeek', label: 'Diese Woche' },
  { value: 'custom', label: 'Benutzerdefiniert' },
];

function cents(v: number) {
  return (v / 100).toFixed(2).replace('.', ',') + ' €';
}

const ROLE_COLORS: Record<string, string> = {
  Bar: 'border-l-blue-500',
  Essen: 'border-l-orange-500',
  Komplett: 'border-l-emerald-500',
  Unbekannt: 'border-l-muted',
};

const HistoricalStatistics = () => {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [data, setData] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailySortAsc, setDailySortAsc] = useState(false);
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [expandedKitchenHour, setExpandedKitchenHour] = useState<number | null>(null);

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

  const handleCsvExport = () => {
    if (!data) return;
    const rows = [['Produkt', 'Kategorie', 'Menge', 'Umsatz']];
    for (const p of data.allProducts) {
      rows.push([p.product_name, p.category_name || '', String(p.qty), cents(p.revenue_cents)]);
    }
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistik-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportiert');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Historische Statistik</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleCsvExport} disabled={!data || loading} className="touch-btn-secondary flex items-center gap-2 text-sm py-2 px-4 min-h-0 disabled:opacity-50">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={loadStats} disabled={loading} className="touch-btn-secondary flex items-center gap-2 text-sm py-2 px-4 min-h-0">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2">
        {PRESET_LABELS.map(p => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={cn(
              "px-5 py-3 rounded-xl text-sm font-semibold transition-colors border min-h-[48px]",
              preset === p.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom dates */}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-4">
          <DatePicker label="Von" value={customFrom} onChange={setCustomFrom} />
          <DatePicker label="Bis" value={customTo} onChange={setCustomTo} />
        </div>
      )}

      {loading && <div className="text-center py-12 text-muted-foreground">Daten werden geladen…</div>}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Gesamtumsatz" value={cents(data.totals.total_cents)} accent="text-emerald-600" />
            <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Bestellungen" value={String(data.totals.orders_count)} />
            <KpiCard icon={<Banknote className="w-5 h-5" />} label="Bar" value={`${cents(data.totals.cash_cents)}`} sub={`${data.totals.cash_count}×`} />
            <KpiCard icon={<CreditCard className="w-5 h-5" />} label="Karte" value={`${cents(data.totals.card_cents)}`} sub={`${data.totals.card_count}×`} />
            <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Pfand" value={cents(data.totals.deposit_cents)} />
          </div>

          {/* Role breakdown */}
          <Section title="Umsatz nach Bereichen" icon={<Users className="w-5 h-5" />}>
            <div className="grid gap-4 md:grid-cols-3">
              {data.byRole.map(r => {
                const label = ROLE_LABELS[r.role_name] || r.role_name;
                return (
                  <div key={r.role_name} className={cn("bg-muted/30 rounded-xl p-5 border-l-4", ROLE_COLORS[label] || 'border-l-muted')}>
                    <h4 className="font-display font-bold text-lg text-foreground mb-3">{label}</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <span className="text-muted-foreground">Umsatz:</span>
                      <span className="font-bold text-right text-emerald-600">{cents(r.total_cents)}</span>
                      <span className="text-muted-foreground">Bestellungen:</span>
                      <span className="font-semibold text-right">{r.orders_count}</span>
                      <span className="text-muted-foreground">Bar:</span>
                      <span className="font-semibold text-right">{cents(r.cash_cents)} ({r.cash_count}×)</span>
                      <span className="text-muted-foreground">Karte:</span>
                      <span className="font-semibold text-right">{cents(r.card_cents)} ({r.card_count}×)</span>
                    </div>
                  </div>
                );
              })}
              {data.byRole.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-4">Keine Daten</p>}
            </div>
          </Section>

          {/* Top products */}
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Top Speisen" icon={<UtensilsCrossed className="w-5 h-5" />}>
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

          {/* General peak times */}
          <Section title="Stoßzeiten (Gesamtbetrieb)" icon={<Clock className="w-5 h-5" />}>
            <HourlyList
              items={data.hourly.map(h => ({
                hour: h.hour,
                count: h.orders_count,
                countLabel: 'Bestellungen',
                revenue: h.total_cents,
                topProducts: h.topProducts,
              }))}
              expandedHour={expandedHour}
              onToggle={h => setExpandedHour(expandedHour === h ? null : h)}
            />
          </Section>

          {/* Kitchen peak times */}
          <Section
            title="Küchen-Stoßzeiten (nur Speisen)"
            icon={<UtensilsCrossed className="w-5 h-5" />}
            accentClass="border-orange-500/30"
            headerClass="text-orange-600"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Für Küchenplanung: zeigt nur Speisen-Bestellungen je Stunde.
            </p>
            {data.hourlyFood && data.hourlyFood.length > 0 ? (
              <HourlyList
                items={data.hourlyFood.map(h => ({
                  hour: h.hour,
                  count: h.food_items_count,
                  countLabel: 'Speisen',
                  revenue: h.food_revenue_cents,
                  topProducts: h.topProducts.map(p => ({ product_name: p.product_name, qty: p.qty })),
                }))}
                expandedHour={expandedKitchenHour}
                onToggle={h => setExpandedKitchenHour(expandedKitchenHour === h ? null : h)}
                accentColor="text-orange-600"
                barColor="bg-orange-500"
              />
            ) : (
              <p className="text-muted-foreground text-center py-4">Keine Speisen-Daten</p>
            )}
          </Section>

          {/* Daily overview */}
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
                  <span className="font-bold text-emerald-600">{cents(d.total_cents)}</span>
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

/* ── Sub-components ── */

function DatePicker({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-sm min-h-[48px]">
            <CalendarIcon className="w-4 h-4" />
            {value ? format(value, 'dd.MM.yyyy') : 'Datum wählen'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="stat-card flex flex-col items-center gap-2 p-5">
      <div className="text-primary">{icon}</div>
      <div className={cn("stat-card-value text-xl font-bold", accent)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      <div className="stat-card-label text-xs">{label}</div>
    </div>
  );
}

function Section({ title, icon, children, accentClass, headerClass }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accentClass?: string; headerClass?: string;
}) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-6", accentClass)}>
      <h3 className={cn("font-display text-lg font-semibold mb-4 flex items-center gap-2", headerClass)}>
        <span className={headerClass || "text-primary"}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ProductTable({ products, showCategory }: {
  products: { product_name: string; category_name?: string; qty: number; revenue_cents: number }[];
  showCategory?: boolean;
}) {
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

interface HourlyItem {
  hour: number;
  count: number;
  countLabel: string;
  revenue: number;
  topProducts: { product_name: string; qty: number }[];
}

function HourlyList({ items, expandedHour, onToggle, accentColor, barColor }: {
  items: HourlyItem[];
  expandedHour: number | null;
  onToggle: (h: number) => void;
  accentColor?: string;
  barColor?: string;
}) {
  if (items.length === 0) return <p className="text-muted-foreground text-center py-4">Keine Daten</p>;
  const maxCount = Math.max(...items.map(i => i.count), 1);

  return (
    <div className="space-y-2">
      {items.map(h => (
        <div key={h.hour} className="bg-muted/30 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors min-h-[56px]"
            onClick={() => onToggle(h.hour)}
          >
            <span className="font-mono font-bold text-lg w-16 shrink-0">{String(h.hour).padStart(2, '0')}:00</span>
            {/* Mini bar */}
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor || "bg-primary")}
                style={{ width: `${(h.count / maxCount) * 100}%` }}
              />
            </div>
            <span className={cn("text-sm whitespace-nowrap", accentColor || "text-muted-foreground")}>
              {h.count} {h.countLabel}
            </span>
            <span className="font-semibold whitespace-nowrap">{cents(h.revenue)}</span>
            {expandedHour === h.hour ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
          </button>
          {expandedHour === h.hour && h.topProducts.length > 0 && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-xs text-muted-foreground mb-2">Top-Produkte:</p>
              <div className="flex flex-wrap gap-2">
                {h.topProducts.map((p, i) => (
                  <span key={i} className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm">
                    {p.product_name} <span className={cn("font-semibold", accentColor || "text-primary")}>{p.qty}×</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default HistoricalStatistics;
