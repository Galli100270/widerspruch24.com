import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, X } from 'lucide-react';
import { useLocalization } from './hooks/useLocalization';

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLocalization();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      // Verhindern, dass der Browser das Standard-Banner anzeigt
      event.preventDefault();
      // Speichern des Events, um es später auszulösen
      setInstallPrompt(event);
      // Banner nur anzeigen, wenn die App nicht bereits im Standalone-Modus läuft
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Aufräumen
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // Zeige den Installations-Dialog des Browsers
    const result = await installPrompt.prompt();
    // Logge das Ergebnis (optional)
    console.log(`Install prompt was: ${result.outcome}`);
    // Verstecke das Banner, egal was der Nutzer wählt
    setIsVisible(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Optional: Logik hinzufügen, um Banner für eine Weile nicht mehr anzuzeigen (z.B. mit localStorage)
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md z-50">
      <div className="glass rounded-2xl p-4 shadow-2xl border border-white/20 flex items-center gap-4 animate-fade-in-up">
        <div className="glass w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div className="flex-grow">
          <p className="text-white font-medium text-sm leading-tight">Besseres Erlebnis?</p>
          <p className="text-white/70 text-xs">App für Schnellzugriff installieren.</p>
        </div>
        <Button
          onClick={handleInstall}
          size="sm"
          className="glass text-white border-white/30 hover:glow flex-shrink-0"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Installieren
        </Button>
        <Button onClick={handleDismiss} variant="ghost" size="icon" className="text-white/60 hover:text-white h-8 w-8 flex-shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;