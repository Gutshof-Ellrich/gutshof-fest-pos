import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  resetCounterApi,
  resetAllCounters,
  fetchCounterValues,
  type CounterType,
} from '@/services/counterService';

const OrderNumberReset = () => {
  const [counters, setCounters] = useState<Record<CounterType, number>>({
    togo: 0,
    service: 0,
    drink: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadCounters = async () => {
    try {
      const vals = await fetchCounterValues();
      setCounters(vals);
    } catch {
      // offline
    }
  };

  useEffect(() => {
    loadCounters();
  }, []);

  const handleReset = async (type: CounterType, label: string) => {
    if (!confirm(`${label}-Nummern wirklich zurücksetzen?`)) return;
    setLoading(true);
    try {
      await resetCounterApi(type);
      toast.success(`${label}-Nummern zurückgesetzt`);
      await loadCounters();
    } catch {
      toast.error(`Fehler beim Zurücksetzen der ${label}-Nummern`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Alle Bestellnummern wirklich zurücksetzen?')) return;
    setLoading(true);
    try {
      await resetAllCounters();
      toast.success('Alle Nummernkreise zurückgesetzt');
      await loadCounters();
    } catch {
      toast.error('Fehler beim Zurücksetzen');
    } finally {
      setLoading(false);
    }
  };

  const items: { type: CounterType; label: string; prefix: string; color: string }[] = [
    { type: 'togo', label: 'ToGo', prefix: 'TOGO', color: 'bg-amber-500' },
    { type: 'service', label: 'Service', prefix: 'SERV', color: 'bg-emerald-500' },
    { type: 'drink', label: 'Getränke', prefix: 'DRINK', color: 'bg-sky-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-foreground">
        Bestellnummern zurücksetzen
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map(({ type, label, prefix, color }) => (
          <div
            key={type}
            className="bg-card rounded-xl border border-border p-5 flex flex-col items-center gap-3"
          >
            <div className={`${color} text-white text-sm font-bold px-3 py-1 rounded-full`}>
              {prefix}
            </div>
            <div className="text-3xl font-black text-foreground">{counters[type]}</div>
            <div className="text-sm text-muted-foreground">Aktuelle {label}-Nummer</div>
            <button
              onClick={() => handleReset(type, label)}
              disabled={loading}
              className="w-full touch-btn-destructive text-sm py-2 min-h-0 disabled:opacity-50"
            >
              {label} zurücksetzen
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleResetAll}
        disabled={loading}
        className="touch-btn-destructive disabled:opacity-50"
      >
        Alle Nummernkreise zurücksetzen
      </button>

      <p className="text-sm text-muted-foreground">
        Das Zurücksetzen wirkt sofort auf allen Geräten. Die nächste Bestellung startet wieder bei 1.
      </p>
    </div>
  );
};

export default OrderNumberReset;
