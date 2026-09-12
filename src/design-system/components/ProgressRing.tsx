import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'ai' | 'success' | 'warning' | 'danger';
  label?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 80,
  strokeWidth = 7,
  variant = 'primary',
  label,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    primary: '#F97316',
    ai: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center select-none', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-extrabold text-white font-display tracking-tight tabular-nums">{Math.round(percentage)}%</span>
        {label && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.10em]">{label}</span>}
      </div>
    </div>
  );
};
