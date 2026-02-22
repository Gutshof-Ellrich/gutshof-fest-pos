import { useAppStore, UserRole } from '@/store/useAppStore';

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
        <header className="py-8 px-6 text-center">
          <h1 className={`text-5xl md:text-6xl font-normal mb-2 ${
            backgroundImage ? 'text-white' : 'text-primary'
          }`} style={{ fontFamily: "'Great Vibes', cursive" }}>
            Gutshof Ellrich
          </h1>
          <p className={`text-xl font-display ${
            backgroundImage ? 'text-white/80' : 'text-muted-foreground'
          }`}>
            Kassensystem
          </p>
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
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
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
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-display font-bold">Essen</h3>
                  <p className="text-white/80 text-sm">
                    Speisen & Grill
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
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
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
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
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
