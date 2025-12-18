
import { useState, useEffect, useCallback } from 'react';
import { getTranslation } from '@/components/lib/localization';
import { User } from '@/entities/User';

export const useLocalization = () => {
  const [language, setLanguageState] = useState('de'); // FESTE Standardsprache: Deutsch
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const detectBrowserLanguage = () => {
    if (typeof navigator === 'undefined') return 'de';
    
    const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage];
    
    for (let browserLang of browserLangs) {
      const lang = browserLang.split('-')[0].toLowerCase();
      if (['de', 'en', 'ar'].includes(lang)) {
        return lang;
      }
    }
    
    return 'de'; // Fallback auf Deutsch
  };
  
  const checkAuthAndSetLang = useCallback(async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }

    // Neu: Keine Browser-Autodetektion mehr – Standard bleibt DE,
    // außer der Nutzer hat explizit eine Sprache gewählt.
    const storedLang = (typeof localStorage !== 'undefined') ? localStorage.getItem('widerspruch24_language') : null;
    let selectedLang = 'de';

    if (storedLang && ['de', 'en', 'ar'].includes(storedLang)) {
      selectedLang = storedLang;
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('widerspruch24_language', 'de');
      }
    }
    
    setLanguageState(selectedLang);
    
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', selectedLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', selectedLang);
      
      let metaLang = document.querySelector('meta[name="language"]');
      if (!metaLang) {
        metaLang = document.createElement('meta');
        metaLang.setAttribute('name', 'language');
        document.head.appendChild(metaLang);
      }
      metaLang.setAttribute('content', selectedLang);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuthAndSetLang();
  }, [checkAuthAndSetLang]);

  const setLanguage = (lang) => {
    if (['de', 'en', 'ar'].includes(lang)) {
      if (typeof localStorage !== 'undefined') { // Added check for localStorage
        localStorage.setItem('widerspruch24_language', lang);
      }
      setLanguageState(lang);
      
      if (typeof document !== 'undefined') {
        if (lang === 'ar') {
          document.documentElement.setAttribute('dir', 'rtl');
          document.documentElement.setAttribute('lang', 'ar');
        } else {
          document.documentElement.setAttribute('dir', 'ltr');
          document.documentElement.setAttribute('lang', lang);
        }
        
        // Meta-Tag aktualisieren
        let metaLang = document.querySelector('meta[name="language"]');
        if (metaLang) {
          metaLang.setAttribute('content', lang);
        }
      }
      
      // Seite neu laden um alle Übersetzungen zu aktualisieren
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const t = useCallback((key, replacements = {}) => {
    const translationSet = getTranslation(language);
    let translation = key.split('.').reduce((obj, k) => obj && obj[k], translationSet);
    
    if (!translation) {
      console.warn(`Missing translation for key: ${key} in language: ${language}`);
      return key;
    }

    // Template-Ersetzungen
    Object.keys(replacements).forEach(rKey => {
      translation = translation.replace(new RegExp(`\\{${rKey}\\}`, 'g'), replacements[rKey]);
    });

    return translation;
  }, [language]);

  const formatDate = useCallback((date, format = 'long') => {
    // Robust parser to avoid "Invalid time value"
    const toDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof val === 'object') {
        // Common shapes: {year, month, day} or {date: "..."}
        if ('year' in val && 'month' in val) {
          const d = new Date(val.year, Math.max(0, (val.month || 1) - 1), val.day || 1);
          return isNaN(d.getTime()) ? null : d;
        }
        if ('date' in val) {
          const d = new Date(val.date);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      return null;
    };
    const dateObj = toDate(date);
    if (!dateObj) return typeof date === 'string' ? date : '';

    if (language === 'ar') {
      return format === 'short'
        ? dateObj.toLocaleDateString('ar-SA')
        : dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (language === 'de') {
      return format === 'short'
        ? dateObj.toLocaleDateString('de-DE')
        : dateObj.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return format === 'short'
      ? dateObj.toLocaleDateString('en-GB')
      : dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [language]);

  const formatCurrency = useCallback((amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) {
      return String(amount);
    }
    if (language === 'ar') {
      return new Intl.NumberFormat('ar-SA', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(num);
    } else if (language === 'de') {
      return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(num);
    }
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(num);
  }, [language]);

  return { 
    language, 
    setLanguage, 
    t, 
    formatDate, 
    formatCurrency, 
    isLoading,
    user
  };
};

