import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertCircle, UserCheck } from 'lucide-react';
import { useLocalization } from '@/components/hooks/useLocalization';
import { User } from '@/entities/User';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function GuestExpiredModal({ isOpen, onClose }) {
  const { t } = useLocalization();
  
  const handleGoogleLogin = async () => {
    // Redirect zur Registrierung/Login, nach Erfolg zurück zur aktuellen Seite
    await User.loginWithRedirect(window.location.href);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 text-white max-w-lg p-0">
        <Card className="bg-transparent border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 border-amber-400/50">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <CardTitle className="text-2xl">{t('guestExpiredTitle')}</CardTitle>
            <p className="text-white/80">{t('guestExpiredMessage')}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pb-8 px-8">
            <div className="glass rounded-lg p-4 flex items-center gap-3 border border-blue-400/30">
              <UserCheck className="w-6 h-6 text-blue-300 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-200">{t('guestExpiredBenefit')}</h4>
                <p className="text-sm text-blue-200/80">{t('guestExpiredBenefitDesc')}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleGoogleLogin}
                className="w-full bg-white text-black hover:bg-gray-200 py-6 text-base"
              >
                {/* Füge hier ein Google-Icon ein, wenn verfügbar */}
                {t('loginWithGoogle')}
              </Button>
              <Button 
                disabled 
                className="w-full bg-black text-white py-6 text-base disabled:opacity-50"
                title={t('loginWithApple')}
              >
                 {t('loginWithApple')}
              </Button>
               <Button 
                disabled 
                variant="outline"
                className="w-full glass border-white/30 text-white py-6 text-base disabled:opacity-50"
                title={t('loginWithEmail')}
              >
                {t('loginWithEmail')}
              </Button>
            </div>

            <p className="text-xs text-white/60 text-center">
              {t('loginTOS', {
                terms: <Link to={createPageUrl('Agb')} className="underline hover:text-white">{t('loginTermsLink')}</Link>,
                privacy: <Link to={createPageUrl('Datenschutz')} className="underline hover:text-white">{t('loginPrivacyLink')}</Link>
              })}
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}