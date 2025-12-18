import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function TrialBadge({ daysLeft, className = "" }) {
  const { t } = useLocalization();

  if (daysLeft <= 0) return null;

  return (
    <Badge 
      className={`bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1 ${className}`}
    >
      <Crown className="w-3 h-3" />
      {t('trial.badgeText', { days: daysLeft })}
    </Badge>
  );
}