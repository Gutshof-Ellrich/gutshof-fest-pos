import { useAppStore, UserRole } from '@/store/useAppStore';
import logoGutshof from '@/assets/logo-gutshof.png';
import { Wine, UtensilsCrossed, Settings } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const { backgroundImage } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Bordeaux Overlay */}
      <div 
        className={`absolute inset-0 ${
          backgroundImage 
            ? 'bg-[hsl(348,60%,20%)]/70' 
            : 'bg-background'
        }`} 
      />
      
      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-10 pb-6 px-6 flex flex-col items-center">
          <img
            src={logoGutshof}
            alt="Logo Gutshof Ellrich"
            className="w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 object-contain drop-shadow-lg"
          />
          <div className="mt-8 md:mt-10 w-full max-w-md">
            <h1 className={`text-4xl md:text-5xl lg:text-6xl tracking-[0.04em] leading-relaxed text-center ${
              backgroundImage ? 'text-white' : 'text-primary'
            }`} style={{ fontFamily: "Zapfino, 'Palace Script MT', 'Lucida Calligraphy', cursive", fontWeight: 700 }}>
              Gutshof Ellrich
            </h1>
            <p className={`text-sm md:text-base tracking-[0.15em] uppercase mt-2 text-right ${
              backgroundImage ? 'text-white/70' : 'text-muted-foreground'
            }`} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              Kassensystem
            </p>
          </div>
        </header>

        {/* Login Options */}
        <main className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-4xl">
            <h2 className={`text-2xl font-display font-semibold text-center mb-8 ${
              backgroundImage ? 'text-white' : 'text-foreground'
            }`}>
              Bitte wählen Sie Ihren Bereich
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Bar Login */}
              <button
                onClick={() => onLogin('bar')}
                className="login-card login-card-bar group"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                    <Wine className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Bar</h3>
                  <p className="text-white/80 text-sm">
                    Getränkeverkauf & Pfand
                  </p>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>

              {/* Food Login */}
              <button
                onClick={() => onLogin('food')}
                className="login-card login-card-food group"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                    <UtensilsCrossed className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Essen</h3>
                  <p className="text-white/80 text-sm">
                    Speisen
                  </p>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>

              {/* Combined Login */}
              <button
                onClick={() => onLogin('combined')}
                className="login-card bg-gradient-to-br from-violet-600 to-purple-700 text-white group"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                    <Wine className="w-8 h-8 -mr-1" />
                    <UtensilsCrossed className="w-8 h-8 -ml-1" />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Komplett</h3>
                  <p className="text-white/80 text-sm">
                    Getränke & Speisen
                  </p>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>

              {/* Admin Login */}
              <button
                onClick={() => onLogin('admin')}
                className="login-card login-card-admin group"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                    <Settings className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Admin</h3>
                  <p className="text-white/80 text-sm">
                    Verwaltung & Statistiken
                  </p>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className={`py-4 text-center text-sm ${
          backgroundImage ? 'text-white/60' : 'text-muted-foreground'
        }`}>
          <p>© 2025 Gutshof Ellrich</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginScreen;
