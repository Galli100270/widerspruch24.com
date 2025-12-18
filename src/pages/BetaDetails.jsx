
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Gift, Search, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTrialStatus } from '@/components/hooks/useTrialStatus';
import TrialBadge from '@/components/TrialBadge';

export default function BetaDetails({ t }) {
  // Hooks müssen immer an erster Stelle aufgerufen werden.
  const { isOnTrial, daysLeft } = useTrialStatus();

  // Erst nach den Hooks kann eine bedingte Rückgabe erfolgen.
  if (!t) return null; 

  const sections = [
    {
      icon: Gift,
      title: t('betaDetails.section1.title'),
      desc: t('betaDetails.section1.desc'),
    },
    {
      icon: Search,
      title: t('betaDetails.section2.title'),
      desc: t('betaDetails.section2.desc'),
    },
    {
      icon: MessageCircle,
      title: t('betaDetails.section3.title'),
      desc: t('betaDetails.section3.desc'),
    }
  ];

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{t('betaDetails.mainTitle')}</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">{t('betaDetails.mainSubtitle')}</p>
          {isOnTrial && (
            <div className="mt-6 flex justify-center">
              <TrialBadge daysLeft={daysLeft} className="text-base px-4 py-2" />
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {sections.map((section, idx) => (
            <Card key={idx} className="glass border-white/20">
              <CardHeader>
                <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center mb-4">
                  <section.icon className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-sm">{section.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="glass rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">{t('betaDetails.ctaTitle')}</h2>
            <p className="text-white/80 mb-8">{t('betaDetails.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to={createPageUrl('Scanner')}>
                <Button className="glass text-white border-white/30 hover:glow transition-all duration-300 px-8 py-3 w-full sm:w-auto">
                  {t('betaDetails.startButton')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Feedback')}>
                <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10 px-8 py-3 w-full sm:w-auto">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('betaDetails.feedbackButton')}
                </Button>
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
