import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export type ProgressVariant = 'primary' | 'ai' | 'success' | 'warning' | 'danger';

export interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles: Record<ProgressVariant, string> = {
    primary: 'bg-brand-500 shadow-sm shadow-brand-500/30',
    ai: 'bg-indigo-500 shadow-sm shadow-indigo-500/30',
    success: 'bg-emerald-500 shadow-sm shadow-emerald-500/30',
    warning: 'bg-amber-500 shadow-sm shadow-amber-500/30',
    danger: 'bg-red-500 shadow-sm shadow-red-500/30',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-400">Progress</span>
          <span className="text-white">{Math.round(percentage)}%</span>
        </div>
      )}

      <div
        className={cn('w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5', sizeStyles[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full transition-all', variantStyles[variant])}
        />
      </div>
    </div>
  );
};
