import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TrendingUp, Award, Zap } from '../icons';

export interface ProgressMetric {
  name: string;
  change: string;
  isPositive: boolean;
}

export interface ProgressResponseCardProps {
  summary: string;
  highlights: string[];
  metrics: ProgressMetric[];
  className?: string;
}

export const ProgressResponseCard: React.FC<ProgressResponseCardProps> = React.memo(({
  summary,
  highlights,
  metrics,
  className,
}) => {
  return (
    <Card variant="default" className={`p-5 flex flex-col gap-4 select-none my-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />}>
          STRENGTH & VOLUME INSIGHTS
        </Badge>
        <span className="text-xs font-bold text-brand-400">30-Day Analysis</span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{summary}</p>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col text-xs">
            <span className="text-[10px] text-slate-400 font-semibold">{m.name}</span>
            <span className={`font-extrabold ${m.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {m.change}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        {highlights.map((h, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

ProgressResponseCard.displayName = 'ProgressResponseCard';
