import React from 'react';
import { cn } from '../../../lib/utils';
import { Card, CardProps } from './Card';

export interface SectionCardProps extends Omit<CardProps, 'title'> {
  title?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, children, title, action, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn('flex flex-col', className)} {...props}>
        {(title || action) && (
          <div className="flex justify-between items-center mb-4">
            {title && <h3 className="text-xl font-bold">{title}</h3>}
            {action && <div>{action}</div>}
          </div>
        )}
        {children}
      </Card>
    );
  }
);
SectionCard.displayName = 'SectionCard';
