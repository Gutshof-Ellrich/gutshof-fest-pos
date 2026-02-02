import { useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const BackgroundImageUpload = () => {
  const { backgroundImage, setBackgroundImage } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wählen Sie eine Bilddatei aus');
      return;
    }

    // Check file size (max 5MB for localStorage)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 5 MB groß sein');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBackgroundImage(result);
      toast.success('Hintergrundbild gespeichert');
    };
    reader.onerror = () => {
      toast.error('Fehler beim Laden des Bildes');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setBackgroundImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Hintergrundbild entfernt');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-foreground">Startseiten-Hintergrundbild</h2>
      
      <div className="bg-card rounded-xl border border-border p-6 max-w-2xl">
        <p className="text-muted-foreground mb-4">
          Laden Sie ein Hintergrundbild für die Startseite (Login-Auswahl) hoch. 
          Das Bild wird lokal gespeichert und mit einem halbtransparenten Overlay versehen.
        </p>
        
        {/* Current Image Preview */}
        {backgroundImage && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Aktuelles Bild:
            </label>
            <div className="relative aspect-video max-w-md rounded-lg overflow-hidden border border-border">
              <img 
                src={backgroundImage} 
                alt="Hintergrundbild Vorschau" 
                className="w-full h-full object-cover"
              />
              {/* Overlay Preview */}
              <div className="absolute inset-0 bg-[hsl(348,60%,20%)]/60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">Vorschau mit Overlay</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex flex-wrap gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="background-image-upload"
          />
          <label
            htmlFor="background-image-upload"
            className="touch-btn-primary cursor-pointer inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {backgroundImage ? 'Bild ändern' : 'Bild hochladen'}
          </label>
          
          {backgroundImage && (
            <button
              onClick={handleRemoveImage}
              className="touch-btn-destructive inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Bild entfernen
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Hinweise:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Empfohlene Auflösung: mindestens 1920×1080 Pixel</li>
            <li>• Unterstützte Formate: JPG, PNG, WebP</li>
            <li>• Maximale Dateigröße: 5 MB</li>
            <li>• Das Bild wird im Seitenverhältnis beibehalten (Cover)</li>
            <li>• Ein Bordeaux-Overlay sorgt für gute Lesbarkeit</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BackgroundImageUpload;
