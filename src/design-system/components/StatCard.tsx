import React from 'react';
import { TrendingUp } from '../icons';
import { cn } from '../tokens';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'ai' | 'action' | 'lime';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  trend,
  icon,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'bg-[#11141D] border-white/[0.07] hover:border-white/[0.14]',
    primary: 'bg-orange-500/[0.05] border-orange-500/20 hover:border-orange-500/35',
    ai: 'bg-indigo-500/[0.05] border-indigo-500/20 hover:border-indigo-500/35',
    action: 'bg-lime-500/[0.05] border-lime-500/20 hover:border-lime-500/35',
    lime: 'bg-lime-500/[0.05] border-lime-500/20 hover:border-lime-500/35',
  };

  const iconColors = {
    default: 'text-slate-300',
    primary: 'text-orange-400',
    ai: 'text-indigo-400',
    action: 'text-lime-400',
    lime: 'text-lime-400',
  };

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group select-none shadow-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 font-sans">{title}</span>
        {icon && (
          <div className={cn('p-2 rounded-xl bg-white/[0.04] group-hover:scale-105 transition-transform', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display tabular-nums">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-xs font-semibold">
          <TrendingUp
            className={cn('w-3.5 h-3.5', trend.isPositive ? 'text-emerald-400' : 'text-red-400 rotate-180')}
          />
          <span className={trend.isPositive ? 'text-emerald-400' : 'text-red-400'}>{trend.value}</span>
          <span className="text-slate-500 text-[10px] ml-0.5 tracking-wide">vs last week</span>
        </div>
      )}
    </div>
  );
};
