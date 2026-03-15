import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Lock, Delete } from 'lucide-react';

interface AdminPinDialogProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminPinDialog = ({ onSuccess, onCancel }: AdminPinDialogProps) => {
  const { adminPin } = useAppStore();
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const maxLength = adminPin.length;

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= maxLength) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setError(false);

    if (newPin.length === maxLength) {
      if (newPin === adminPin) {
        onSuccess();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setEnteredPin('');
          setShake(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border p-8 w-full max-w-sm mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Admin-Zugang</h2>
          <p className="text-sm text-muted-foreground mt-1">PIN eingeben</p>
        </div>

        {/* PIN Dots */}
        <div className={`flex justify-center gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < enteredPin.length
                  ? error
                    ? 'bg-destructive border-destructive'
                    : 'bg-primary border-primary'
                  : 'border-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive mb-4">Falscher PIN</p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl text-xl font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="h-14 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl text-xl font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPinDialog;
