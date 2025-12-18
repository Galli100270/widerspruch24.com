
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, CheckCircle, FileScan, FileSignature } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home({ t, language }) { // Props from Layout
  const navigate = useNavigate();

  useEffect(() => {
    // Fallback-Redirect: falls der Router unerwartet auf Home landet
    try {
      const pendingId = sessionStorage.getItem('nav_case_id');
      if (pendingId) {
        sessionStorage.removeItem('nav_case_id');
        navigate(createPageUrl(`CaseDetails?case_id=${pendingId}`), { replace: true });
      }
    } catch (e) {
      console.error("Failed to handle nav_case_id fallback:", e);
    }
  }, [navigate]);

  if (!t) return null; // Wait for props

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-8 md:p-12 mb-12">
            <div className="inline-block glass rounded-2xl px-6 py-2 mb-8">
              <span className="text-white font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('home.trustIndicatorAI')}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {t('home.mainTitle', { defaultValue: 'Rechtssicher. Schnell. Digital.' })}
            </h1>
            
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              {t('home.mainSubtitle', { defaultValue: 'Erstellen Sie Widersprüche gegen Bescheide oder setzen Sie professionelle Schreiben auf – alles mit KI-Unterstützung.' })}
            </p>

            {/* --- NEUE AUSWAHL --- */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Link to={createPageUrl("Scanner")}>
                <Card className="glass border-white/20 h-full text-left hover:glow transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
                        <FileScan className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-xl">{t('home.choiceObjectionTitle', { defaultValue: 'Widerspruch einlegen' })}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 mb-4">{t('home.choiceObjectionDesc', { defaultValue: 'Gegen fehlerhafte Bescheide, Rechnungen oder Bußgelder.' })}</p>
                    <div className="text-blue-300 font-semibold flex items-center gap-2">
                      {t('home.ctaShort', { defaultValue: 'Jetzt starten' })}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Schreiben")}>
                <Card className="glass border-white/20 h-full text-left hover:glow transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
                        <FileSignature className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-xl">{t('home.choiceLetterTitle', { defaultValue: 'Schreiben aufsetzen' })}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 mb-4">{t('home.choiceLetterDesc', { defaultValue: 'Für Mahnungen, Fristsetzungen oder beliebige formelle Briefe.' })}</p>
                    <div className="text-purple-300 font-semibold flex items-center gap-2">
                      {t('home.ctaShort', { defaultValue: 'Jetzt starten' })}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('home.featureTitle')}
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {t('home.featureSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-3xl p-8 text-center group hover:glow transition-all duration-300">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t('home.step1Title')}</h3>
              <p className="text-white/80 leading-relaxed">{t('home.step1Desc')}</p>
            </div>
            <div className="glass rounded-3xl p-8 text-center group hover:glow transition-all duration-300">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t('home.step2Title')}</h3>
              <p className="text-white/80 leading-relaxed">{t('home.step2Desc')}</p>
            </div>
            <div className="glass rounded-3xl p-8 text-center group hover:glow transition-all duration-300">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t('home.step3Title')}</h3>
              <p className="text-white/80 leading-relaxed">{t('home.step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-white mb-6">
              {t('home.pricingTitle')}
            </h2>
            <div className="text-6xl font-bold text-white mb-4">
              {t('home.price')}
            </div>
            <p className="text-xl text-white/80 mb-8">
              {t('home.priceSuffix')}
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">{t('home.benefit1')}</span>
                </div>
                <p className="text-white/70 text-sm">{t('home.benefit1Desc')}</p>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">{t('home.benefit2')}</span>
                </div>
                <p className="text-white/70 text-sm">{t('home.benefit2Desc')}</p>
              </div>
            </div>
            <Link to={createPageUrl("Scanner")}>
              <Button className="glass text-white border-white/30 hover:glow transition-all duration-300 text-lg px-12 py-6 rounded-2xl">
                {t('home.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-3xl p-8">
            <div className="text-center">
              <p className="text-white/60 mb-4">{t('home.footerCopyright')}</p>
              <div className="flex justify-center gap-6 text-sm text-white/60">
                <Link to={createPageUrl("Datenschutz")} className="hover:text-white transition-colors">{t('home.footerPrivacy')}</Link>
                <Link to={createPageUrl("Impressum")} className="hover:text-white transition-colors">{t('home.footerImprint')}</Link>
                <Link to={createPageUrl("Agb")} className="hover:text-white transition-colors">{t('home.footerTerms')}</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
