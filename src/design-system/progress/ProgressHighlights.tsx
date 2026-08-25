import React from 'react';
import { TrendingUp, Dumbbell, Calendar, Activity } from '../icons';
import { cn } from '../tokens';

export interface ImprovementItem {
  id: string;
  metric: string;
  currentValue: string;
  change: string;
  timePeriod: string;
  icon?: React.ReactNode;
}

export interface ProgressHighlightsProps {
  items?: ImprovementItem[];
  className?: string;
}

export const ProgressHighlights: React.FC<ProgressHighlightsProps> = React.memo(({
  items = [
    {
      id: 'h1',
      metric: 'Incline Barbell Bench Press',
      currentValue: '82.5 kg',
      change: '+7.5 kg',
      timePeriod: 'since last month',
      icon: <Dumbbell className="w-3.5 h-3.5 text-orange-400" />,
    },
    {
      id: 'h2',
      metric: 'Training Consistency',
      currentValue: '4.4 sessions/week',
      change: '+18%',
      timePeriod: 'last 30 days',
      icon: <Calendar className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'h3',
      metric: 'Body Composition',
      currentValue: '14.2% Body Fat',
      change: '-1.8%',
      timePeriod: 'since January',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
    },
  ],
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col gap-3 select-none', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          What's Improving
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 sm:p-4 rounded-xl bg-[#11141D] border border-white/[0.06] flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
                {item.icon || <TrendingUp className="w-3.5 h-3.5 text-orange-400" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  {item.metric}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {item.timePeriod}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 text-right">
              <span className="text-sm font-bold text-emerald-400 tabular-nums font-display">
                {item.change}
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                {item.currentValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ProgressHighlights.displayName = 'ProgressHighlights';
