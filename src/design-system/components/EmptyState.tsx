import React from 'react';
import { Button } from './Button';
import { HelpCircle } from '../icons';
import { cn } from '../tokens';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <HelpCircle className="w-10 h-10 text-slate-500" />,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-slate-900/50 border border-dashed border-white/10 gap-4 max-w-md mx-auto my-6 select-none',
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{description}</p>
      </div>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
