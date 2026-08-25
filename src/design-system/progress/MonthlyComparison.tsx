import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TrendingUp, Award } from '../icons';

export interface MonthlyComparisonProps {
  currentMonthName?: string;
  lastMonthName?: string;
  volumeDiffKg?: number;
  strengthDiffPct?: number;
  className?: string;
}

export const MonthlyComparison: React.FC<MonthlyComparisonProps> = React.memo(({
  currentMonthName = 'July',
  lastMonthName = 'June',
  volumeDiffKg = 18450,
  strengthDiffPct = 8.2,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Month-over-Month Growth</span>
        <Badge variant="success" size="sm">{currentMonthName} vs {lastMonthName}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Volume Growth</span>
          <span className="text-xl font-extrabold text-brand-400">+{volumeDiffKg.toLocaleString()} kg</span>
          <span className="text-[10px] text-emerald-400 font-semibold">+15.2% heavier workload</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Compound 1RM Growth</span>
          <span className="text-xl font-extrabold text-indigo-400">+{strengthDiffPct}%</span>
          <span className="text-[10px] text-emerald-400 font-semibold">Continuous progressive overload</span>
        </div>
      </div>
    </Card>
  );
});

MonthlyComparison.displayName = 'MonthlyComparison';
