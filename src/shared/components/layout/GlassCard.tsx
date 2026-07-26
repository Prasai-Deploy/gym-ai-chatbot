import React from 'react';
import { cn } from '../../../lib/utils';
import { Card, CardProps } from './Card';

export const GlassCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'bg-zinc-900/50 backdrop-blur-md border border-white/5',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);
GlassCard.displayName = 'GlassCard';
