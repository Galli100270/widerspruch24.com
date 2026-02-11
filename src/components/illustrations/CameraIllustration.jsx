import React from "react";

export default function CameraIllustration({ size = 140, className = "" }) {
  const s = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="camGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#3b82f6"/>
        </linearGradient>
        <radialGradient id="lensGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93c5fd"/>
          <stop offset="100%" stopColor="#1e3a8a"/>
        </radialGradient>
      </defs>
      <rect x="20" y="50" width="160" height="100" rx="18" fill="url(#camGrad)" opacity="0.9" />
      <rect x="40" y="35" width="50" height="25" rx="8" fill="#94a3b8" opacity="0.7" />
      <circle cx="100" cy="100" r="34" fill="url(#lensGrad)" />
      <circle cx="100" cy="100" r="18" fill="#0ea5e9" opacity="0.55" />
      <circle cx="78" cy="88" r="6" fill="#e0f2fe" opacity="0.9" />
      <rect x="145" y="70" width="18" height="10" rx="2" fill="#fde68a" />
    </svg>
  );
}