import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  fetchKitchenSettings,
  updateKitchenSettings,
  type KitchenSettings as KS,
} from '@/services/kitchenService';

const KitchenSettings = () => {
  const [settings, setSettings] = useState<KS>({ enabled: true, warn_minutes: 5 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKitchenSettings()
      .then(setSettings)
      .catch(() => toast.error('Küchenmonitor-Einstellungen konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (update: Partial<KS>) => {
    const next = { ...settings, ...update };
    setSettings(next);
    setSaving(true);
    try {
      await updateKitchenSettings(update);
      toast.success('Einstellung gespeichert');
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground p-4">Laden…</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-foreground">Küchenmonitor</h2>

      <div className="bg-card rounded-xl border border-border p-6 max-w-md space-y-5">
        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Küchenmonitor aktiv</p>
            <p className="text-sm text-muted-foreground">
              Speisenbestellungen werden automatisch an den Monitor gesendet
            </p>
          </div>
          <button
            onClick={() => save({ enabled: !settings.enabled })}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              settings.enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                settings.enabled ? 'translate-x-7' : ''
              }`}
            />
          </button>
        </div>

        {/* Warn threshold */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Warnschwelle (Minuten)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={settings.warn_minutes}
              onChange={(e) =>
                setSettings((s) => ({ ...s, warn_minutes: Math.max(1, Number(e.target.value) || 5) }))
              }
              min={1}
              max={60}
              className="numeric-input max-w-[120px]"
            />
            <button
              onClick={() => save({ warn_minutes: settings.warn_minutes })}
              disabled={saving}
              className="touch-btn-primary text-sm py-2 px-4 min-h-0"
            >
              Speichern
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Bestellungen werden nach dieser Zeit rot hervorgehoben.
          </p>
        </div>

        {/* Link to kitchen display */}
        <div className="pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Küchenmonitor öffnen:</p>
          <a
            href="/kitchen"
            target="_blank"
            rel="noopener"
            className="text-primary font-semibold hover:underline"
          >
            {window.location.origin}/kitchen →
          </a>
        </div>
      </div>
    </div>
  );
};

export default KitchenSettings;
