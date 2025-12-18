import React from 'react';

export default function LegalMeta({ date, version, t }) {
  if (!t) return null;
  return (
    <p className="text-sm text-gray-500 mt-8 border-t border-white/20 pt-4">
      {t('legalLastUpdated', { date })} • {t('legalVersion', { version })}
    </p>
  );
}