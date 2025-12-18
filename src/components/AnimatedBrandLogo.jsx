import React from "react";
import { BRAND } from "@/components/brand";

export default function AnimatedBrandLogo({ size = 28, className = "" }) {
  const px = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      aria-label={BRAND.alt}
      title={BRAND.name}
    >
      <img
        src={BRAND.logoUrl}
        alt={BRAND.alt}
        className="w-full h-full object-contain drop-shadow"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))" }}
      />
      <style>{`
        .drop-shadow { }
        @keyframes gentle-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
        @keyframes shelf-run {
          0% { transform: translateX(-3%) }
          50% { transform: translateX(3%) }
          100% { transform: translateX(-3%) }
        }
      `}</style>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "gentle-bounce 2.8s ease-in-out infinite, shelf-run 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}