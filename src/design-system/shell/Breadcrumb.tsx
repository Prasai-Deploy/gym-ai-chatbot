import React from 'react';
import { ChevronRight, Dumbbell } from '../icons';
import { cn } from '../tokens';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = React.memo(({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs text-slate-400 select-none', className)}>
      <span className="flex items-center gap-1 text-slate-500 font-semibold">
        <Dumbbell className="w-3.5 h-3.5 text-orange-500" />
        <span>STRIVA</span>
      </span>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          {item.onClick || item.href ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-white font-medium transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-white">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

Breadcrumb.displayName = 'Breadcrumb';
