import React from 'react';
import { Progress } from './Progress';
import { cn } from '../tokens';

export interface MetricCardProps {
  label: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'ai' | 'success';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  currentValue,
  targetValue,
  unit,
  icon,
  variant = 'primary',
  className,
}) => {
  const percentage = Math.min(Math.round((currentValue / (targetValue || 1)) * 100), 100);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] flex flex-col gap-3 transition-all duration-200 hover:border-white/[0.14] select-none shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-orange-400">{icon}</span>}
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums">{percentage}%</span>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">{currentValue}</span>
          <span className="text-xs text-slate-400">/ {targetValue} {unit}</span>
        </div>
      </div>

      <Progress value={currentValue} max={targetValue} variant={variant} size="sm" />
    </div>
  );
};
