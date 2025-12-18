
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText, MessageCircle, Info } from 'lucide-react';

export default function AppFooter({ language, t }) {
  // Fallback function if t is not available
  const getText = (key, fallback) => {
    if (!t || typeof t !== 'function') {
      // Fallback translations for when t() is not working
      const fallbacks = {
        de: {
          'footer.tagline': 'Rechtssichere Widersprüche in 3 Minuten',
          'footer.legalTitle': 'Rechtliches',
          'footer.supportTitle': 'Hilfe & Support',
          'footer.imprint': 'Impressum',
          'footer.privacy': 'Datenschutz',
          'footer.terms': 'AGB',
          'footer.cookieSettings': 'Cookie-Einstellungen',
          'footer.feedback': 'Feedback',
          'footer.betaInfo': 'Beta-Informationen',
          'footer.copyright': '© 2024 Widerspruch24. Alle Rechte vorbehalten.',
          'footer.systemHealth': 'Systemstatus', 
          'appName': 'Widerspruch24'
        },
        en: {
          'footer.tagline': 'Legally sound objections in 3 minutes',
          'footer.legalTitle': 'Legal',
          'footer.supportTitle': 'Help & Support',
          'footer.imprint': 'Imprint',
          'footer.privacy': 'Privacy Policy',
          'footer.terms': 'Terms of Service',
          'footer.cookieSettings': 'Cookie Settings',
          'footer.feedback': 'Feedback',
          'footer.betaInfo': 'Beta Information',
          'footer.copyright': '© 2024 Objection24. All rights reserved.',
          'footer.systemHealth': 'System Health', 
          'appName': 'Objection24'
        },
        ar: {
          'footer.tagline': 'اعتراضات قانونية سليمة في 3 دقائق',
          'footer.legalTitle': 'قانوني',
          'footer.supportTitle': 'المساعدة والدعم',
          'footer.imprint': 'بيانات النشر',
          'footer.privacy': 'سياسة الخصوصية',
          'footer.terms': 'شروط الخدمة',
          'footer.cookieSettings': 'إعدادات ملفات تعريف الارتباط',
          'footer.feedback': 'ملاحظات',
          'footer.betaInfo': 'معلومات النسخة التجريبية',
          'footer.copyright': '© 2024 اعتراض24. جميع الحقوق محفوظة.',
          'footer.systemHealth': 'صحة النظام', 
          'appName': 'اعتراض24'
        }
      };
      const currentLangFallbacks = fallbacks[language] || fallbacks.de;
      return currentLangFallbacks[key] || fallback || key;
    }
    return t(key) || fallback || key;
  };

  const handleCookiePreferences = () => {
    if (typeof window !== 'undefined' && typeof window.__openCookiePrefs === 'function') {
      window.__openCookiePrefs();
    } else {
      alert('Cookie-Einstellungs-Manager wird geladen...');
    }
  };

  return (
    <footer className="relative z-10 mt-16 border-t border-white/10">
      <div className="glass">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 glass rounded-xl flex items-center justify-center glow">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">{getText('appName')}</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                {getText('footer.tagline')}
              </p>
            </div>

            {/* Legal Links */}
            <div className="md:col-span-1">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {getText('footer.legalTitle')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to={createPageUrl(language === 'de' ? 'Impressum' : 'Imprint')} className="text-white/70 hover:text-white text-sm transition-colors">
                    {getText('footer.imprint')}
                  </Link>
                </li>
                <li>
                  <Link to={createPageUrl(language === 'de' ? 'Datenschutz' : 'Privacy')} className="text-white/70 hover:text-white text-sm transition-colors">
                    {getText('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link to={createPageUrl(language === 'de' ? 'Agb' : 'Terms')} className="text-white/70 hover:text-white text-sm transition-colors">
                    {getText('footer.terms')}
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={handleCookiePreferences}
                    className="text-white/70 hover:text-white text-sm transition-colors text-left"
                  >
                    {getText('footer.cookieSettings')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Support Links */}
            <div className="md:col-span-1">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {getText('footer.supportTitle')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to={createPageUrl('Feedback')} className="text-white/70 hover:text-white text-sm transition-colors">
                    {getText('footer.feedback')}
                  </Link>
                </li>
                <li>
                  <Link to={createPageUrl('BetaDetails')} className="text-white/70 hover:text-white text-sm transition-colors">
                    {getText('footer.betaInfo')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Beta Badge */}
            <div className="md:col-span-1 flex flex-col items-start md:items-end">
              <div className="glass rounded-full px-4 py-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">Beta-Phase aktiv</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs">Made in Germany</p>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-white/10 pt-8 mt-8">
            <p className="text-white/60 text-sm text-center">
              {getText('footer.copyright')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
