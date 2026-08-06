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
  variant?: 'default' | 'primary' | 'ai';
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
    default: 'bg-slate-900/80 border-white/10 hover:border-white/20',
    primary: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50',
    ai: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50',
  };

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group select-none',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-white/5 text-orange-400 group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-white tracking-tight">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-xs font-semibold">
          <TrendingUp
            className={cn('w-3.5 h-3.5', trend.isPositive ? 'text-emerald-400' : 'text-red-400 rotate-180')}
          />
          <span className={trend.isPositive ? 'text-emerald-400' : 'text-red-400'}>{trend.value}</span>
          <span className="text-slate-500 text-[10px] ml-0.5">vs last week</span>
        </div>
      )}
    </div>
  );
};
