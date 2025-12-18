import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Calendar, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function BetaConsent() {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('widerspruch24_beta_consent');
    if (!hasConsented) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('widerspruch24_beta_consent', 'accepted');
    setIsOpen(false);
  };

  const handleDecline = () => {
    // In einer echten App würde hier ein Logout oder Redirect stattfinden
    window.location.href = createPageUrl('Home');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <Card className="max-w-lg w-full glass border-white/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <CardTitle className="text-white text-xl">{t('betaConsentTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-white/80 space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-white">{t('betaConsentTrial')}</div>
                <div className="text-sm">{t('betaConsentTrialDesc')}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-white">{t('betaConsentBeta')}</div>
                <div className="text-sm">{t('betaConsentBetaDesc')}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="glass border-white/30 text-white hover:bg-white/10"
            >
              {t('betaConsentDecline')}
            </Button>
            <Button
              onClick={handleAccept}
              className="glass text-white border-white/30 hover:glow transition-all duration-300"
            >
              {t('betaConsentAccept')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}