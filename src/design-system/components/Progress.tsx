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
  const percentage = Math.min(Math.max((value / (max || 1)) * 100, 0), 100);

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3.5',
  };

  const variantStyles: Record<ProgressVariant, string> = {
    primary: 'bg-orange-500 shadow-sm shadow-orange-500/25',
    ai: 'bg-indigo-500 shadow-sm shadow-indigo-500/25',
    success: 'bg-emerald-500 shadow-sm shadow-emerald-500/25',
    warning: 'bg-amber-500 shadow-sm shadow-amber-500/25',
    danger: 'bg-red-500 shadow-sm shadow-red-500/25',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-[0.10em]">
          <span className="text-slate-400">Progress</span>
          <span className="text-white tabular-nums">{Math.round(percentage)}%</span>
        </div>
      )}

      <div
        className={cn('w-full bg-[#181C28] rounded-full overflow-hidden p-0.5 border border-white/[0.05]', sizeStyles[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={cn('h-full rounded-full transition-all', variantStyles[variant])}
        />
      </div>
    </div>
  );
};
