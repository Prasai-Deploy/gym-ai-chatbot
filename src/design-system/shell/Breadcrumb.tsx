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
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs text-slate-400 select-none font-sans', className)}>
      <span className="flex items-center gap-1 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
        <Dumbbell className="w-3 h-3 text-orange-500" />
        <span>STRIVA</span>
      </span>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          {item.onClick || item.href ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-white font-medium transition-colors text-[11px]"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-bold text-white text-[11px] tracking-tight">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

Breadcrumb.displayName = 'Breadcrumb';
