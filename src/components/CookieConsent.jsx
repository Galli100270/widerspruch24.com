
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Shield, BarChart2, Megaphone } from 'lucide-react';
import { useLocalization } from './hooks/useLocalization';

const COOKIE_CONSENT_KEY = 'widerspruch24_cookie_consent';
const COOKIE_VERSION = 1;

export default function CookieConsent() {
  const { t } = useLocalization();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent || JSON.parse(consent).version !== COOKIE_VERSION) {
      setShowBanner(true);
    }

    // Globale Funktion zum Öffnen der Cookie-Einstellungen aus dem Footer
    // This needs to be defined regardless of whether the banner is initially shown,
    // so it's always accessible from other parts of the application (e.g., footer).
    window.__openCookiePrefs = () => {
      const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (savedConsent) {
        setPreferences(JSON.parse(savedConsent).preferences);
      }
      setShowDetails(true);
      setShowBanner(true);
    };

    return () => {
      delete window.__openCookiePrefs;
    };
  }, []);

  const handleAcceptAll = () => {
    const newPrefs = { necessary: true, analytics: true, marketing: true };
    savePreferences(newPrefs);
  };

  const handleAcceptNecessary = () => {
    const newPrefs = { necessary: true, analytics: false, marketing: false };
    savePreferences(newPrefs);
  };
  
  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs) => {
    const consent = {
      version: COOKIE_VERSION,
      timestamp: new Date().toISOString(),
      preferences: prefs
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setShowBanner(false);
    setShowDetails(false);
    // Hier könnten Tracking-Skripte basierend auf der Zustimmung nachgeladen werden
    // z.B. if (prefs.analytics) { initAnalytics(); }
    window.location.reload(); // Reload to apply settings
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return;
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="glass rounded-3xl border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
        {showDetails ? (
          // Detailansicht
          <>
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{t('cookie.detailsTitle')}</h2>
              <p className="text-white/70 text-sm mt-1">{t('cookie.detailsSubtitle')}</p>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Technisch Notwendig */}
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">{t('cookie.necessaryTitle')}</h3>
                    <Switch checked={true} disabled className="opacity-70" />
                  </div>
                  <p className="text-white/70 text-sm mt-1">{t('cookie.necessaryDesc')}</p>
                </div>
              </div>
              {/* Analyse */}
              <div className="flex items-start gap-4">
                <BarChart2 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">{t('cookie.analyticsTitle')}</h3>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={() => togglePreference('analytics')}
                    />
                  </div>
                  <p className="text-white/70 text-sm mt-1">{t('cookie.analyticsDesc')}</p>
                </div>
              </div>
              {/* Marketing */}
              <div className="flex items-start gap-4">
                <Megaphone className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">{t('cookie.marketingTitle')}</h3>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={() => togglePreference('marketing')}
                    />
                  </div>
                  <p className="text-white/70 text-sm mt-1">{t('cookie.marketingDesc')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 mt-auto border-t border-white/10 flex justify-between items-center">
                <Button variant="ghost" onClick={() => setShowDetails(false)} className="text-white/70 hover:text-white">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSavePreferences} className="glass text-white border-white/30 hover:glow">
                  {t('cookie.saveButton')}
                </Button>
            </div>
          </>
        ) : (
          // Banner-Ansicht
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">{t('cookie.title')}</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              {t('cookie.description')}{' '}
              <Link to={createPageUrl('Datenschutz')} className="text-blue-400 hover:underline">
                {t('footer.privacy')}
              </Link>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleAcceptNecessary} variant="outline" className="glass border-white/30 text-white hover:bg-white/10 flex-1">
                {t('cookie.necessaryOnlyButton')}
              </Button>
              <Button onClick={() => setShowDetails(true)} variant="outline" className="glass border-white/30 text-white hover:bg-white/10 flex-1">
                {t('cookie.customizeButton')}
              </Button>
              <Button onClick={handleAcceptAll} className="glass text-white border-white/30 hover:glow flex-1">
                <Check className="w-4 h-4 mr-2" />
                {t('cookie.acceptAllButton')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
