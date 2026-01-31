import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Zap, Package, CreditCard, Loader2, FileText } from 'lucide-react';
import { useLocalization } from '@/components/hooks/useLocalization';
import { useTrialStatus } from '@/components/hooks/useTrialStatus';
import { User } from '@/entities/User';
import { trackEvent } from "@/components/lib/analytics";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { configStatus } from "@/functions/configStatus";
import { stripeCheckoutSubscription } from "@/functions/stripeCheckoutSubscription";
import { stripeCheckoutCredits } from "@/functions/stripeCheckoutCredits";

export default function ChoosePlan() {
  const { t, formatCurrency } = useLocalization();
  const navigate = useNavigate();
  const { decisionRequired, daysLeft, plan, selectPlan } = useTrialStatus();
  const [loading, setLoading] = useState(null);
  const [paymentsReady, setPaymentsReady] = useState(true);
  const [cfgCheckedAt, setCfgCheckedAt] = useState(null);

  // Redirect wenn keine Entscheidung erforderlich
  useEffect(() => {
    if (!decisionRequired && plan) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [decisionRequired, plan, navigate]);

  // fire view_pricing on mount
  React.useEffect(() => {
    trackEvent('view_pricing', {});
  }, []);

  // Check config status on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await configStatus();
        setPaymentsReady(!!data?.paymentsEnabled);
        setCfgCheckedAt(data?.ts || new Date().toISOString());
      } catch {
        setPaymentsReady(false);
        setCfgCheckedAt(new Date().toISOString());
      }
    })();
  }, []);

  const handlePlanSelection = async (planType) => {
    if (!paymentsReady && (planType === 'subscription' || planType === 'credits' || planType === 'per_case')) {
      // Disabled silently while payments are not configured
      return;
    }
    setLoading(planType);
    trackEvent('begin_checkout', { plan: planType });
    
    try {
      const user = await User.me();
      console.log(`Starting checkout for plan: ${planType}, userId: ${user.id}`);
      
      // TODO: Hier die echten Backend-Aufrufe einfügen, sobald die Stripe-Integration verfügbar ist.
      await new Promise(resolve => setTimeout(resolve, 1500));
      let checkoutUrl;

      if (planType === 'subscription') {
        const response = await stripeCheckoutSubscription({ userId: user.id });
        checkoutUrl = response.data?.url;
        if (!checkoutUrl) throw new Error(response.data?.error || 'Keine Checkout-URL erhalten');
        window.location.href = checkoutUrl;
        return;
      } else if (planType === 'credits') {
        const response = await stripeCheckoutCredits({ pack: '20', userId: user.id });
        checkoutUrl = response.data?.url;
        if (!checkoutUrl) throw new Error(response.data?.error || 'Keine Checkout-URL erhalten');
        window.location.href = checkoutUrl;
        return;
      } else if (planType === 'per_case') {
        await selectPlan(planType); // Store decision without immediate payment
        navigate(createPageUrl('Dashboard'));
        setLoading(null);
        return;
      }
      
      // In a real app, this would redirect:
      // window.location.href = checkoutUrl;
      // For simulation, we'll just log and stop.
      
    } catch (error) {
      console.error('Failed to select plan:', error);
      alert(t('planSelectionError'));
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'per_case',
      icon: FileText,
      title: t('plan.perCaseTitle'),
      price: formatCurrency(5),
      suffix: t('plan.perCaseSuffix'),
      features: [
        t('plan.perCaseFeature1'),
        t('plan.perCaseFeature2'),
        t('plan.perCaseFeature3')
      ],
      popular: false,
      buttonText: t('plan.perCaseButton'),
      description: t('plan.perCaseDesc')
    },
    {
      id: 'subscription',
      icon: Zap,
      title: t('plan.subscriptionTitle'),
      price: formatCurrency(20),
      suffix: t('plan.subscriptionSuffix'),
      features: [
        t('plan.subscriptionFeature1'),
        t('plan.subscriptionFeature2'),
        t('plan.subscriptionFeature3'),
        t('plan.subscriptionFeature4')
      ],
      popular: true,
      buttonText: t('plan.subscriptionButton'),
      description: t('plan.subscriptionDesc')
    },
    {
      id: 'credits',
      icon: Package,
      title: t('plan.creditsTitle'),
      price: formatCurrency(22.50),
      suffix: t('plan.creditsSuffix'),
      features: [
        t('plan.creditsFeature1'),
        t('plan.creditsFeature2'),
        t('plan.creditsFeature3')
      ],
      popular: false,
      buttonText: t('plan.creditsButton'),
      description: t('plan.creditsDesc')
    }
  ];

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Admin/Owner Warning if payments disabled - DISABLED per user request */}
        {false && !paymentsReady && (
          <Alert className="mb-4 border-amber-400 bg-amber-50 text-amber-900">
            <AlertDescription>
              Zahlungen derzeit deaktiviert: Stripe/APP-Variablen fehlen. Funktionen für Export/Versand sind gesperrt.
              {cfgCheckedAt ? ` (Stand: ${new Date(cfgCheckedAt).toLocaleString()})` : ''}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-white text-sm">
              {daysLeft > 0 
                ? t('trial.endsIn', { days: daysLeft })
                : t('trial.expired')
              }
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{t('plan.choosePlanTitle')}</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {t('plan.choosePlanSubtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const disabled = !paymentsReady;
            return (
              <Card 
                key={plan.id} 
                className={`glass relative ${plan.popular ? 'border-purple-400/50 glow' : 'border-white/20'}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600/50 text-white border-purple-400/50">
                    {t('plan.popular')}
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">{plan.title}</CardTitle>
                  <div className="text-3xl font-bold text-white">{plan.price}</div>
                  <div className="text-white/60 text-sm">{plan.suffix}</div>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 text-sm mb-6 text-center">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-white/80">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={loading === plan.id || disabled}
                    className={`w-full py-3 rounded-2xl transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-purple-600/50 hover:bg-purple-500/50 text-white border-purple-400/50' 
                        : 'glass text-white border-white/30 hover:glow'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {loading === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('plan.selecting')}</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" />{plan.buttonText}</>
                    )}
                  </Button>

                  {/* Disabled per user request */}
                  {false && !paymentsReady && (
                    <div className="text-xs text-amber-300 mt-2 text-center">
                      Zahlungsaktivierung erforderlich (Stripe-Keys & Preise).
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="glass rounded-2xl p-6 text-center">
          <h3 className="text-white font-semibold mb-2">{t('plan.decisionInfo')}</h3>
          <p className="text-white/80 text-sm">
            {t('plan.decisionDetails')}
          </p>
        </div>
      </div>
    </div>
  );
}