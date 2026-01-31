import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// import { HelmetProvider } from 'react-helmet-async'; // Deactivated for debugging
import { createPageUrl } from "@/utils";
import { User, LogOut, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User as UserEntity } from "@/entities/User";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/components/hooks/useLocalization";
// import BetaConsent from "@/components/BetaConsent"; // Removed BetaConsent import
import TrialBanner from "@/components/TrialBanner";
import AppFooter from "@/components/AppFooter";
import ErrorBoundary from '@/components/ErrorBoundary';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SEO from '@/components/SEO';
import CookieConsent from '@/components/CookieConsent'; // Importieren
import { Alert, AlertDescription } from "@/components/ui/alert";
import { configStatus } from "@/functions/configStatus";
import { initMonitoring } from "@/components/lib/monitoring";
import { callWithRetry } from "@/components/lib/network";
import LoginDialog from "@/components/auth/LoginDialog"; // Added import
import { saveDailySnapshotOnce } from "@/components/lib/snapshot";
import { BRAND } from "@/components/brand"; // Added import
import AnimatedBrandLogo from "@/components/AnimatedBrandLogo"; // Added import

export default function Layout({ children, currentPageName }) {
  const { language, setLanguage, t, user, isLoading } = useLocalization();
  const [showChatbot, setShowChatbot] = React.useState(false);
  const [paymentsReady, setPaymentsReady] = React.useState(true);
  const [cfgTs, setCfgTs] = React.useState(null);
  const [showLogin, setShowLogin] = React.useState(false); // Added state for LoginDialog

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Redirect /cases/:id -> CaseDetails?case_id=:id
    const path = location.pathname || "";
    const match = path.match(/^\/cases\/([^/]+)$/i);
    if (match && match[1]) {
      const id = match[1];
      navigate(createPageUrl(`CaseDetails?case_id=${id}`), { replace: true });
    }
  }, [location.pathname, navigate]);

  React.useEffect(() => {
    // Nach erfolgreichem Login: gespeichertes Ziel aufrufen (verhindert 404 und doppelte Login-Flows)
    (async () => {
      if (!user) return;
      try {
        const stored = localStorage.getItem("w24_post_login");
        if (!stored) return;

        let targetPath = null;
        try {
          const u = new URL(stored);
          // Nur innerhalb derselben Origin weiterleiten
          if (typeof window !== "undefined" && u.origin === window.location.origin) {
            targetPath = u.pathname + u.search;
          } else {
            // Fallback: komplette URL (z. B. andere Origin)
            window.location.href = stored;
            localStorage.removeItem("w24_post_login");
            return;
          }
        } catch {
          // war bereits ein Pfad
          targetPath = stored;
        }

        // Nur navigieren, wenn wir nicht bereits dort sind
        if (targetPath && (window.location.pathname + window.location.search) !== targetPath) {
          navigate(targetPath, { replace: true });
        }
      } catch (e) {
        console.error("Failed to redirect after login:", e);
      } finally {
        try { localStorage.removeItem("w24_post_login"); } catch (e) { console.error("Failed to clear post_login storage:", e); }
      }
    })();
  }, [user, navigate]);

  React.useEffect(() => {
    // Set document direction based on language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]); // Add language as a dependency

  React.useEffect(() => {
    initMonitoring();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await callWithRetry(() => configStatus(), 2, 300);
        setPaymentsReady(!!data?.paymentsEnabled);
        setCfgTs(data?.ts || null);
      } catch {
        setPaymentsReady(false);
        setCfgTs(new Date().toISOString());
      }
    })();
  }, []);

  // On load: if we have a short-lived apple_profile cookie and user is logged-in, link to account
  React.useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const cookies = document.cookie || "";
        const m = cookies.split(";").map(s => s.trim()).find(s => s.startsWith("apple_profile="));
        if (!m) return;
        const raw = decodeURIComponent(m.split("=")[1] || "");
        const obj = JSON.parse(atob(raw));
        if (!obj?.sub) return;

        // Persist on current user
        await UserEntity.updateMyUserData({
          apple_sub: obj.sub,
          apple_email: obj.email || "",
          apple_email_private: !!obj.email_private,
          apple_linked_at: new Date().toISOString()
        });

        // Clear cookie client-side
        document.cookie = "apple_profile=; Path=/; Max-Age=0; SameSite=Lax; Secure";
      } catch (error) {
        // ignore errors during cookie parsing or update, e.g., malformed cookie
        console.warn("Failed to link Apple profile:", error);
      }
    })();
  }, [user]);

  // Erstelle einmal täglich einen Snapshot des aktuellen Zustands (unter heutigem Datum)
  React.useEffect(() => {
    try {
      saveDailySnapshotOnce({
        page: currentPageName || "",
        url: typeof window !== "undefined" ? window.location.href : "",
      });
    } catch (e) {
      // Catching potential errors, e.g., if window is not defined in certain SSR scenarios
      console.error("Failed to save daily snapshot:", e);
    }
  }, [currentPageName]);

  // Präsentationsmodus: aktivierbar via ?present=1 oder ?mode=demo
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isPresentation = params.get('present') === '1' || params.get('mode') === 'demo';
      const root = document.documentElement;
      if (isPresentation) {
        root.classList.add('presentation-mode');
      } else {
        root.classList.remove('presentation-mode');
      }
    } catch {}
  }, []);

  const handleLogout = async () => {
    await UserEntity.logout();
    window.location.href = createPageUrl('Home'); // Reload to clear all state
  };

  const getSEOProps = () => {
    const defaultTitle = t('seo.defaultTitle', { appName: BRAND.name }) || `${BRAND.name} - ${BRAND.tagline}`;
    const defaultDescription = t('seo.defaultDescription') || BRAND.description;
    const defaultKeywords = t('seo.defaultKeywords') || BRAND.keywords;
    const currentUrl = typeof window !== 'undefined' ? window.location.href : BRAND.baseUrl;

    let seoData = {
      title: defaultTitle,
      description: defaultDescription,
      keywords: defaultKeywords,
      favicon: BRAND.faviconUrl || "/favicon.ico", // Ensure a favicon is always provided
      ogTitle: defaultTitle,
      ogDescription: defaultDescription,
      ogImage: BRAND.openGraphImageUrl || BRAND.logoUrl, // Use a specific OG image or logo
      ogUrl: currentUrl,
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterImage: BRAND.openGraphImageUrl || BRAND.logoUrl,
      twitterTitle: defaultTitle,
      twitterDescription: defaultDescription,
    };

    if (currentPageName === 'Impressum') {
      seoData.title = t('seo.impressumTitle') || 'Impressum - Widerspruch24.de';
      seoData.description = t('seo.impressumDescription') || 'Das Impressum von Widerspruch24.de mit allen rechtlich notwendigen Angaben.';
      seoData.keywords = 'Impressum, Rechtsberatung, Widerspruch, Widerruf, Deutschland, Anbieterkennzeichnung';
      // Specific OG for Impressum if needed, otherwise defaults apply
    }
    // Add other page-specific SEO overrides here if needed
    // Example:
    // if (currentPageName === 'CaseDetails') {
    //   seoData.title = `Case: ${caseId} - ${BRAND.name}`;
    //   seoData.description = `Details for case ${caseId}`;
    // }

    return seoData;
  };

  // Beta-Check (30 Tage)
  const isBetaFree = React.useMemo(() => {
    try {
      let started = localStorage.getItem("w24_beta_started_at");
      if (!started) return true; // If no start date, assume beta is free/active
      const diffDays = (Date.now() - Date.parse(started)) / (1000 * 60 * 60 * 24);
      return diffDays <= 30; // Free for 30 days
    } catch {
      return true; // In case of localStorage error, default to free
    }
  }, []);

  if (isLoading) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center gradient-bg">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
    );
  }

  // Sichere Kind-Renderlogik: nur clonen, wenn es ein valides einzelnes Element ist.
  const safeChildren = React.isValidElement(children)
    ? React.cloneElement(children, { t: t, language: language })
    : children;

  // RETURN: umschließen mit Fragment, Kommentare als JSX-Kommentare
  return (
    <>
      {/* <HelmetProvider> Deactivated for debugging/testing */}
      <ErrorBoundary t={t}>
        <div className="min-h-screen relative overflow-hidden flex flex-col">
          <CookieConsent />
          <SEO {...getSEOProps()} language={language} />

          {/* Copy-Protect nur außerhalb der Beta und nur auf Preview-Seite */}
          {(!isBetaFree && currentPageName === 'Preview') && (
            <style>{`
              #letter-content {
                -webkit-user-select: none !important;
                user-select: none !important;
                position: relative;
              }
              #letter-content::after {
                content: "PREVIEW – COPY PROTECTED";
                position: absolute;
                inset: 0;
                background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 12px, transparent 12px, transparent 24px);
                color: rgba(0,0,0,0.15);
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2em;
                font-weight: bold;
                text-align: center;
                opacity: 0.8;
                z-index: 100;
              }
            `}</style>
          )}

          {/* Admin warning when payments are disabled - DISABLED per user request */}
          {false && !paymentsReady && (
            <div className="relative z-50 px-4 pt-2">
              <div className="max-w-7xl mx-auto">
                <Alert className="border-amber-400 bg-amber-50 text-amber-900">
                  <AlertDescription>
                    Hinweis: Zahlungsfunktionen sind deaktiviert (Stripe/Preise/APP_URL prüfen).
                    {(() => {
                      if (!cfgTs) return "";
                      const d = new Date(cfgTs);
                      return isNaN(d.getTime()) ? "" : ` Stand: ${d.toLocaleString()}`;
                    })()}
                    </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          <a href="#main" className="sr-only focus:not-sr-only absolute top-4 left-4 bg-slate-900 text-white px-4 py-2 rounded-lg z-[100] transition">
            {t('common.skipToContent')}
          </a>
          <style>{`
            /* --- Global Reset & Safety --- */
            *, *::before, *::after { box-sizing: border-box; min-width: 0; }
            html, body { width: 100%; overflow-x: hidden !important; -webkit-text-size-adjust: 100%; }
            img, video, canvas, svg { max-width: 100%; height: auto; display: block; }
            iframe { max-width: 100%; }
            :root {
              color-scheme: light;
              --step--1: clamp(0.875rem, 0.80rem + 0.2vw, 0.95rem);
              --step-0:  clamp(1.00rem, 0.90rem + 0.6vw, 1.125rem);
              --step-1:  clamp(1.25rem, 1.10rem + 0.9vw, 1.50rem);
              --step-2:  clamp(1.60rem, 1.30rem + 1.2vw, 1.90rem);

              --content-max: 1200px;
              --content-gutter: clamp(16px, 4vw, 24px);
              --card-gap: clamp(12px, 2.5vw, 20px);
              --card-padding: clamp(16px, 2.5vw, 24px);
              --fab-size: 64px;

              /* theme */
              --surface: rgba(255,255,255,1);
              --border: rgba(15,23,42,0.10);
              --ink: #0b1220;
              --ink-muted: #cbd5e1;
              --primary: #2563eb;
              --primary-hover: #1d4ed8;
              --on-primary: #ffffff;

              /* Glass with stronger contrast */
              --glass-bg: rgba(30, 41, 59, 0.45);
              --glass-border: rgba(148, 163, 184, 0.35);
              --glass-shadow: 0 16px 40px rgba(2,6,23,0.25);
              --legal-font-scale: 1;
            }
            @media (prefers-color-scheme: dark){
              :root{
                color-scheme: dark;
                --surface: rgba(17,24,39,1);
                --border: rgba(148,163,184,0.22);
                --ink: #e6eaf2;
                --ink-muted: #9aa4b2;
                --glass-bg: rgba(30, 41, 59, 0.45);
                --glass-border: rgba(148, 163, 184, 0.35);
              }
            }
            @media (prefers-reduced-motion: reduce){
              * { animation: none !important; transition: none !important; }
            }
            body { font-size: var(--step-0); line-height: 1.65; background-color: #111827; color: #fff; }

            /* RTL-Unterstützung: globale Schrift + Ausrichtung */
            [dir="rtl"] {
              text-align: right;
            }
            [dir="rtl"] body,
            [dir="rtl"] .page-wrap,
            [dir="rtl"] input,
            [dir="rtl"] textarea,
            [dir="rtl"] select,
            [dir="rtl"] button {
              font-family: "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Tahoma", "Arial", system-ui, sans-serif;
            }
            [dir="rtl"] input,
            [dir="rtl"] textarea {
              text-align: right;
            }

            /* CONTAINERS */
            .container-responsive, .page-wrap {
              width: 100%;
              max-width: var(--content-max);
              padding-left: var(--content-gutter);
              padding-right: calc(var(--content-gutter) + env(safe-area-inset-right, 0px));
              margin-inline: auto;
            }
            @media (max-width: 640px){ .page-wrap { padding-bottom: calc(var(--fab-size) + 24px); } }

            /* Glass cards with fallback for browsers ohne backdrop-filter */
            .glass {
              background: var(--glass-bg);
              backdrop-filter: blur(18px);
              -webkit-backdrop-filter: blur(18px);
              border: 1px solid var(--glass-border);
              box-shadow: var(--glass-shadow);
              color: #fff;
            }
            .panel, .case-card, .pricing-card {
              background: var(--glass-bg);
              backdrop-filter: blur(18px);
              -webkit-backdrop-filter: blur(18px);
              border: 1px solid var(--glass-border);
              border-radius: 16px;
              padding: var(--card-padding);
              overflow: visible;
              box-shadow: var(--glass-shadow);
              color: #fff;
              max-width: 100%;
            }
            @supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
              .glass, .panel, .case-card, .pricing-card { background: rgba(30,41,59,0.75); }
            }

            .panel *, .case-card *, .pricing-card * { -webkit-mask-image: -webkit-radial-gradient(white, black); }
            .panel, .case-card, .pricing-card, .glass {
              word-wrap: break-word; overflow-wrap: anywhere; text-wrap: balance;
            }

            .card-grid { display: grid; grid-template-columns: 1fr auto; column-gap: 16px; align-items: start; }
            @media (max-width: 640px){ .card-grid { grid-template-columns: 1fr; } .meta-right { text-align: left !important; } }

            .card-title { font-size: clamp(18px, 2.6vw, 22px); line-height: 1.25; letter-spacing: .2px; color: inherit; }
            .meta-right { text-align: right; font-size: 14px; color: rgba(255,255,255,0.75); }

            /* Inputs & tips readable on dark glass */
            .input-glass, .tip-glass {
              background: rgba(255,255,255,0.06);
              border: 1px solid var(--glass-border);
              color: #fff;
            }
            .input-glass::placeholder { color: rgba(255,255,255,0.7); }

            /* Override unfitting white backgrounds in content area (keep letter preview white) */
            .page-wrap .bg-white { background-color: rgba(255,255,255,0.06) !important; color: #fff !important; border: 1px solid var(--glass-border); }
            #letter-content, #letter-content * { background: #ffffff !important; color: #000000 !important; border-color: #e5e7eb !important; }

            /* Buttons – hit targets ≥44px */
            .btn-primary { min-height: 48px; background: var(--primary); color: var(--on-primary); font-weight: 700; }
            .btn-primary:hover { background: var(--primary-hover); }

            /* FAB */
            .fab { position: fixed; bottom: max(16px, env(safe-area-inset-bottom, 16px)); right: max(16px, env(safe-area-inset-right, 16px)); z-index: 40; }
            .fab > button, .fab .fab-btn { width: var(--fab-size); height: var(--fab-size); box-shadow: 0 8px 24px rgba(0,0,0,.18); border-radius: 9999px; }

            /* Background visuals */
            .gradient-bg { background: radial-gradient(1200px 600px at 50% -50%, #334155 10%, #1f2937 60%, #111827 100%); }
            .floating { animation: floating 8s ease-in-out infinite; }
            @keyframes floating { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-18px); } }

            /* Legal prose & print */
            .prose { color: inherit; }
            .prose h1, .prose h2, .prose h3, .prose strong { color: #fff; }
            .legal-prose { font-size: calc(1.05rem * var(--legal-font-scale, 1)); line-height: 1.8; }
            .legal-prose h1 { font-size: calc(1.8rem * var(--legal-font-scale, 1)); margin-bottom: 1em; }
            .legal-prose h2 { font-size: calc(1.4rem * var(--legal-font-scale, 1)); margin: 1.2em 0 .5em; }
            .legal-prose a { color: #a5b4fc; text-decoration: underline; }

            @media print {
              body, .min-h-screen { background: #fff !important; color: #000 !important; }
              .glass, .gradient-bg, nav, footer, .not-prose, .floating, .no-print { display: none !important; }
              .prose-wrap, .legal-prose { max-width: none; }
              .legal-prose, #letter-content, #letter-content * { color: #000 !important; background: #fff !important; }
            }

            /* --- Global additions for presentation and mobile readiness --- */

            /* Presentation mode: less motion and heavy effects for smooth demos */
            .presentation-mode * {
              transition: none !important;
              animation: none !important;
            }
            .presentation-mode .glass,
            .presentation-mode .panel,
            .presentation-mode .case-card,
            .presentation-mode .pricing-card {
              -webkit-backdrop-filter: blur(8px) !important;
              backdrop-filter: blur(8px) !important;
              box-shadow: 0 8px 24px rgba(2,6,23,0.25) !important;
            }

            /* Make letter preview readable on small screens (no horizontal scroll) */
            @media (max-width: 900px){
              #letter-content {
                width: 100% !important;
                min-height: auto !important;
                padding: 24px !important;
              }
            }
            @media (max-width: 640px){
              #letter-content {
                padding: 18px !important;
                font-size: 0.95rem !important;
                line-height: 1.6 !important;
              }
            }

            /* Ensure dialogs and modals fit tiny screens */
            .radix-dialog-content, .dialog-content, .DialogContent {
              max-width: 96vw !important;
              width: 100% !important;
            }
          `}</style>

          <TrialBanner />

          <div className="fixed inset-0 gradient-bg"></div>

          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-20 w-80 h-80 bg-indigo-700/30 rounded-full blur-3xl floating"></div>
            <div className="absolute top-1/2 -right-20 w-96 h-96 bg-blue-700/25 rounded-full blur-3xl floating" style={{animationDelay: '-2s'}}></div>
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-slate-600/30 rounded-full blur-3xl floating" style={{animationDelay: '-4s'}}></div>
          </div>

          <nav className="relative z-50 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="glass rounded-2xl px-6 py-4">
                <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Link to={createPageUrl("Home")} className={`flex items-center space-x-3 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`} aria-label="Zur Startseite">
                    <img
                      src={BRAND.logoUrl}
                      alt={BRAND.alt}
                      className="w-10 h-10 rounded-lg bg-white shadow ring-1 ring-black/10 object-contain"
                    />
                    <span className="text-xl font-bold text-white">{t('appName') || BRAND.name}</span>
                  </Link>

                  <div className={`flex items-center space-x-4 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="glass rounded-xl text-white hover:glow transition-all duration-300" aria-label="Sprache wählen">
                          <Globe className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="glass border-white/20 text-white">
                        <DropdownMenuItem onClick={() => setLanguage('de')} className="focus:bg-white/10">🇩🇪 Deutsch</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage('en')} className="focus:bg-white/10">🇬🇧 English</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage('ar')} className="focus:bg-white/10">🇸🇦 العربية</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {user ? (
                      <>
                        {/* Vorlagen-Link entfernt */}
                        <Link to={createPageUrl("Dashboard")}>
                          <Button variant="ghost" className="glass rounded-xl text-white hover:glow transition-all duration-300">
                            <User className="w-4 h-4 mr-2" />
                            {t('nav.dashboard')}
                          </Button>
                        </Link>
                        <Button onClick={handleLogout} variant="ghost" className="glass rounded-xl text-white hover:glow transition-all duration-300" aria-label="Abmelden">
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => setShowLogin(true)}
                          className="glass rounded-xl text-white hover:glow transition-all duration-300"
                        >
                          {t('nav.login')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Login-Dialog global eingebunden */}
          {!user && (
            <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
          )}

          <main id="main" className="relative z-10 flex-grow page-wrap container-responsive">
            {/*
              StrictMode hilft bei Runtime-Anomalien in Dev/Preview ohne Funktionsänderung.
            */}
            <React.StrictMode>
              {safeChildren}
            </React.StrictMode>
          </main>

          <div className="fab">
            {!showChatbot && (
              <Button
                onClick={() => setShowChatbot(true)}
                className="fab-btn glass text-white border-2 border-blue-400/50 hover:glow transition-all duration-300 group shadow-2xl"
                title="Paragraphen-Heini fragen 📚⚖️"
                aria-label="Chat öffnen"
              >
                <div className="relative">
                  <AnimatedBrandLogo size={28} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </Button>
            )}

            {showChatbot && (
              <div className="glass border-white/20 rounded-2xl shadow-2xl w-80 h-96 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 glass rounded-full flex items-center justify-center overflow-hidden">
                      <AnimatedBrandLogo size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">Paragraphen-Heini</h3>
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        Bereit für Präzision
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowChatbot(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white h-6 w-6 p-0"
                    aria-label="Chat schließen"
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex-1 p-4 text-center flex items-center justify-center">
                  <div className="text-center">
                    <div className="space-y-3">
                      <div className="w-12 h-12 glass rounded-full flex items-center justify-center mx-auto">
                        <span className="text-2xl">📚</span>
                      </div>
                      <div className="text-white">
                        <p className="text-sm font-medium">Paragraphen-Heini ist bereit! 📚⚖️</p>
                        <p className="text-xs text-white/70 mt-1">Präzise Rechtsfragen • Website-Hilfe • Fall-Analyse</p>
                      </div>
                      <Link to={createPageUrl("Assistant")}>
                        <Button
                          className="glass text-white border-white/30 hover:glow text-xs px-4 py-2"
                          onClick={() => setShowChatbot(false)}
                          aria-label="Chat starten"
                        >
                          Chat mit Paragraphen-Heini öffnen
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BetaConsent disabled per user request */}
          <PWAInstallPrompt />
          <AppFooter language={language} t={t} />
        </div>
      </ErrorBoundary>
      {/* </HelmetProvider> */}
    </>
  );
}