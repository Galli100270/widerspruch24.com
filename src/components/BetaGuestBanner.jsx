import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function BetaGuestBanner({ daysLeft, className = "" }) {
  const { t } = useLocalization();

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <div className={`${isUrgent ? 'bg-amber-500' : 'bg-blue-500'} text-white px-4 py-3 text-sm ${className}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {t('guestBannerTitle')}
          </span>
          <span>
            {t('guestBannerSubtitle', { days: daysLeft })}
          </span>
        </div>
        {isUrgent && (
          <Badge className="bg-white text-amber-600 border-0">
            {t('guestBannerUrgent')}
          </Badge>
        )}
      </div>
    </div>
  );
}