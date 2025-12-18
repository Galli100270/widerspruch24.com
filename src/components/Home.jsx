import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, CheckCircle } from "lucide-react";

export default function Home({ t, language }) { // Props from Layout
  if (!t) return null; // Wait for props

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 mb-12">
            <div className="inline-block glass rounded-2xl px-6 py-2 mb-8">
              <span className="text-white font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('home.trustIndicatorAI')}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {t('home.title').split(' ').slice(0, 1).join(' ')} 
              <span className="bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
                {' '}{t('home.title').split(' ').slice(1).join(' ')}
              </span>
            </h1>
            
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              {t('home.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to={createPageUrl("Scanner")}>
                <Button className="glass text-white border-white/30 hover:glow transition-all duration-300 text-lg px-8 py-6 rounded-2xl group">
                  {t('home.cta')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-2xl transition-all duration-300">
                {t('home.howItWorks')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>{t('home.trust1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>{t('home.trust2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span>{t('home.trust3')}</span>
              </div>
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
                <a href="#" className="hover:text-white transition-colors">{t('home.footerPrivacy')}</a>
                <a href="#" className="hover:text-white transition-colors">{t('home.footerImprint')}</a>
                <a href="#" className="hover:text-white transition-colors">{t('home.footerTerms')}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}