import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchKitchenOrders,
  markKitchenOrderDone,
  fetchKitchenSettings,
  type KitchenOrder,
} from '@/services/kitchenService';

function formatTimer(createdAt: string): string {
  const ts = new Date(createdAt).getTime();
  if (isNaN(ts)) return '00:00';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getMinutesElapsed(createdAt: string): number {
  const ts = new Date(createdAt).getTime();
  if (isNaN(ts)) return 0;
  return Math.floor((Date.now() - ts) / 60000);
}

const POLL_OK = 2000;
const POLL_RETRY = 5000;

const Kitchen = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [warnMinutes, setWarnMinutes] = useState(5);
  const [connected, setConnected] = useState(true);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const connectedRef = useRef(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchKitchenOrders();
      setOrders(data);
      if (!connectedRef.current) {
        connectedRef.current = true;
        setConnected(true);
      }
    } catch {
      if (connectedRef.current) {
        connectedRef.current = false;
        setConnected(false);
      }
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await fetchKitchenSettings();
      setWarnMinutes(s.warn_minutes);
    } catch {
      // use default
    }
  }, []);

  // Adaptive polling: 2s when connected, 5s when disconnected
  useEffect(() => {
    loadOrders();
    loadSettings();
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);

    const startPoll = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(loadOrders, connectedRef.current ? POLL_OK : POLL_RETRY);
    };
    startPoll();

    // Re-evaluate poll interval every 5s
    const adaptiveRef = setInterval(() => {
      startPoll();
    }, 5000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(intervalRef.current);
      clearInterval(adaptiveRef);
    };
  }, [loadOrders, loadSettings]);

  const handleDone = async (id: string) => {
    try {
      await markKitchenOrderDone(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch {
      // retry on next poll
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,15%,10%)] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          🍽️ Küchenmonitor
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {orders.length} offen
          </span>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>

      {/* Grid */}
      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <span className="text-6xl">✅</span>
            <p className="text-2xl text-gray-400 font-medium">
              Keine offenen Bestellungen
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const isWarning = getMinutesElapsed(order.createdAt) >= warnMinutes;
            return (
              <div
                key={order.id}
                className={`rounded-2xl p-5 flex flex-col gap-3 transition-colors ${
                  isWarning
                    ? 'bg-red-900/60 border-2 border-red-500'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                {/* Order header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl font-black tracking-tight">
                      {order.orderNumber || order.orderId?.slice(-4) || '?'}
                    </span>
                  </div>
                  <div
                    className={`text-lg font-mono font-bold px-3 py-1 rounded-lg ${
                      isWarning ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {formatTimer(order.createdAt)}
                  </div>
                </div>

                {/* Customer note */}
                {order.customerNote && (
                  <div className="text-sky-400 font-bold text-base bg-sky-950/40 rounded-lg px-3 py-2">
                    Bestellhinweis: {order.customerNote}
                  </div>
                )}

                {/* Items */}
                <div className="flex-1 space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx}>
                      <div className="text-lg font-semibold">
                        {item.qty}× {item.name}
                      </div>
                      {item.note && (
                        <div className="text-amber-400 font-bold text-base ml-4">
                          Hinweis: {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Done button */}
                <button
                  onClick={() => handleDone(order.id)}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg transition-colors active:scale-95"
                >
                  ✓ Ausgegeben
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kitchen;
