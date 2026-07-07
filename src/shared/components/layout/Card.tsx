import React from 'react';
import { cn } from '../../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, padding = 'md', interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'card', // Uses our global utility class for consistency
          {
            'p-0': padding === 'none',
            'p-4': padding === 'sm',
            'p-6': padding === 'md',
            'p-8': padding === 'lg',
            'hover:-translate-y-1 hover:shadow-md cursor-pointer': interactive,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
