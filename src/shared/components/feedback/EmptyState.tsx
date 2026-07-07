import React from 'react';
import { cn } from '../../../lib/utils';
import { FileQuestion } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center bg-surface-card border border-border-subtle rounded-2xl',
          className
        )}
        {...props}
      >
        <div className="mb-4 text-text-muted h-12 w-12 flex items-center justify-center bg-surface-elevated rounded-full">
          {icon || <FileQuestion className="h-6 w-6" />}
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
        {description && <p className="text-sm text-text-muted mb-6 max-w-sm">{description}</p>}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
