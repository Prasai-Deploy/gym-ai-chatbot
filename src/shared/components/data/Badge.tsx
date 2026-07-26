import React from 'react';
import { cn } from '../../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'success';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
          {
            'bg-accent-primary text-[#121212]': variant === 'primary',
            'bg-surface-elevated text-text-primary': variant === 'secondary',
            'text-text-primary border border-border-subtle': variant === 'outline',
            'bg-red-500/10 text-red-500 border border-red-500/20': variant === 'destructive',
            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': variant === 'success',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
