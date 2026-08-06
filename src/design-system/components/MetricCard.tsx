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
  const percentage = Math.min(Math.round((currentValue / targetValue) * 100), 100);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-3 transition-all duration-200 hover:border-white/20 select-none',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-orange-400">{icon}</span>}
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{percentage}%</span>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{currentValue}</span>
          <span className="text-xs text-slate-400">/ {targetValue} {unit}</span>
        </div>
      </div>

      <Progress value={currentValue} max={targetValue} variant={variant} size="sm" />
    </div>
  );
};
