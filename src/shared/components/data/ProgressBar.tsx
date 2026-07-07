import React from 'react';
import { cn } from '../../../lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  colorClass?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, colorClass = 'bg-accent-primary', size = 'md', ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn(
          'w-full bg-surface-elevated rounded-full overflow-hidden',
          {
            'h-1.5': size === 'sm',
            'h-2': size === 'md',
            'h-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
ProgressBar.displayName = 'ProgressBar';
