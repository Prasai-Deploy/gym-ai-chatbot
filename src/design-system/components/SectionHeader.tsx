import React from 'react';
import { cn } from '../tokens';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 select-none', className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-extrabold text-white tracking-tight font-display">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-slate-400 font-normal">{subtitle}</p>}
      </div>

      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
