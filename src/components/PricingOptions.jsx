import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Crown, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { useLocalization } from './hooks/useLocalization';
import { stripeCheckoutPerCase } from '@/functions/stripeCheckoutPerCase';
import { trackEvent } from '@/components/lib/analytics';

export default function PricingOptions({ caseData }) {
  const { t } = useLocalization();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  // Helper for currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handlePayment = async () => {
    if (!isTermsAccepted) {
      // Assuming 'termsNotAcceptedError' is available in localization
      setError(t('termsNotAcceptedError', { defaultValue: 'Please accept the terms and conditions.' }));
      return;
    }
    trackEvent('begin_checkout', { plan: 'per_case', caseId: caseData?.id ? 'present' : 'none' });
    setLoading(true);
    setError(null);

    try {
      const user = await User.me().catch(() => null);

      if (!caseData?.id) {
        throw new Error("Case ID is missing for per-case checkout.");
      }

      const response = await stripeCheckoutPerCase({ caseId: caseData.id, userId: user?.id });
        
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data?.error || 'No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      // Assuming 'checkoutFailedError' is available in localization
      setError(t('checkoutFailedError', { message: err.message, defaultValue: `Checkout failed: ${err.message}` }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center">
        <Crown className="w-8 h-8 text-amber-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">{t('plan.perCaseTitle')}</h3>
        <p className="text-white/80 mb-6">{t('plan.perCaseDesc')}</p>
        <div className="text-5xl font-bold text-white mb-2">{formatCurrency(5)}</div>
        <p className="text-white/60 mb-6">{t('plan.perCaseSuffix')}</p>
        <Button onClick={handlePayment} disabled={!isTermsAccepted || loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black py-6 rounded-2xl text-lg">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('plan.selecting')}
            </>
          ) : (
            t('plan.perCaseButton')
          )}
        </Button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        <div className="flex items-start gap-3 mt-8">
            <Checkbox
                id="terms-conditions"
                checked={isTermsAccepted}
                onCheckedChange={setIsTermsAccepted}
                className="mt-1"
                aria-label="Ich habe die AGB gelesen und stimme diesen zu."
            />
            <label htmlFor="terms-conditions" className="text-sm text-white/80 text-left">
                Ich habe die <Link to={createPageUrl("Agb")} target="_blank" className="underline hover:text-white">AGB</Link> gelesen und stimme diesen zu. Das <Link to={createPageUrl("Widerrufsrecht")} target="_blank" className="underline hover:text-white">Widerrufsrecht</Link> erlischt mit der Bereitstellung des digitalen Inhalts.
            </label>
        </div>
      </div>
    </div>
  );
}