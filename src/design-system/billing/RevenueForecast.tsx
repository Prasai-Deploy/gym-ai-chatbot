import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface RevenueForecastProps {
  projected30Days?: number;
  projected60Days?: number;
  projected90Days?: number;
  className?: string;
}

export const RevenueForecast: React.FC<RevenueForecastProps> = React.memo(({
  projected30Days = 51400,
  projected60Days = 54800,
  projected90Days = 58200,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Trinity AI 90-Day Revenue Projection</span>
        <Badge variant="warning" size="sm">94% Confidence</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">30-Day Forecast</span>
          <span className="text-base font-extrabold text-amber-400">${projected30Days.toLocaleString()}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">60-Day Forecast</span>
          <span className="text-base font-extrabold text-indigo-400">${projected60Days.toLocaleString()}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">90-Day Forecast</span>
          <span className="text-base font-extrabold text-emerald-400">${projected90Days.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
});

RevenueForecast.displayName = 'RevenueForecast';
