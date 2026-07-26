import React from 'react';
import { cn } from '../../../lib/utils';
import { GlassCard } from './GlassCard';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, valueColor, ...props }, ref) => {
    return (
      <GlassCard
        ref={ref}
        padding="none"
        className={cn('p-3 rounded-2xl', className)}
        {...props}
      >
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">
          {label}
        </div>
        <div className={cn('text-lg font-bold', valueColor || 'text-white')}>
          {value}
        </div>
      </GlassCard>
    );
  }
);
MetricCard.displayName = 'MetricCard';
