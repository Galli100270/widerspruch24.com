import React from "react";

export default function RotatingCaptions({ items = [], intervalMs = 2500, className = "" }) {
  const [index, setIndex] = React.useState(0);
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [];

  React.useEffect(() => {
    if (safeItems.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safeItems.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [safeItems.length, intervalMs]);

  if (safeItems.length === 0) return null;

  return (
    <div className={`text-xs sm:text-sm text-white/70 ${className}`}>
      <span className="inline-block transition-opacity duration-300 will-change-auto">
        {safeItems[index]}
      </span>
    </div>
  );
}