import React from 'react';

export default function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 bg-slate-700/50 rounded-full"></div>
        <div className="h-8 bg-slate-700/50 rounded-md w-16"></div>
      </div>
      <div className="h-6 bg-slate-700/50 rounded-md w-3/4 mb-2"></div>
      <div className="h-4 bg-slate-700/50 rounded-md w-1/2"></div>
    </div>
  );
}