
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Crown, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLocalization } from '@/components/hooks/useLocalization';
import { useTrialStatus } from '@/components/hooks/useTrialStatus';

export default function TrialBanner() {
  const { t } = useLocalization();
  const { isOnTrial, daysLeft, decisionRequired } = useTrialStatus();

  // Nicht anzeigen wenn kein Trial aktiv und keine Entscheidung erforderlich
  if (!isOnTrial && !decisionRequired) return null;

  if (decisionRequired) {
    return (
      <div className="bg-red-500 text-white px-4 py-3 text-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{t('trial.expiredBanner')}</span>
            <span>{t('trial.expiredAction')}</span>
          </div>
          <Link to={createPageUrl('ChoosePlan')}>
            <Button size="sm" className="bg-white text-red-500 hover:bg-gray-100">
              {t('plan.choosePlanNow')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (daysLeft <= 3) {
    return (
      <div className="bg-amber-500 text-white px-4 py-3 text-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">{t('trial.endsSoon', { days: daysLeft })}</span>
            <span>{t('trial.chooseNow')}</span>
          </div>
          <Link to={createPageUrl('ChoosePlan')}>
            <Button size="sm" className="bg-white text-amber-600 hover:bg-gray-100">
              {t('plan.choosePlanNow')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
      <Crown className="w-3 h-3" />
      {t('trial.active', { days: daysLeft })}
    </Badge>
  );
}
