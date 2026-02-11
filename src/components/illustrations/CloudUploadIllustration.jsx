import React from "react";

export default function CloudUploadIllustration({ size = 140, className = "" }) {
  const s = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="cloudGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
      </defs>
      <g opacity="0.95">
        <path d="M60 120c-14 0-26-10-26-24s12-26 26-26c4-18 20-32 40-32 22 0 40 16 42 36 14 2 26 14 26 28 0 16-14 30-30 30H60z" fill="url(#cloudGrad)" />
        <path d="M100 82l-20 22h12v24h16V104h12l-20-22z" fill="#e0f2fe" />
      </g>
    </svg>
  );
}