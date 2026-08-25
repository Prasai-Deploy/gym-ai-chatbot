import React from 'react';
import { cn } from '../tokens';

export interface NavigationItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  badge?: string | number;
  collapsed?: boolean;
  className?: string;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  label,
  icon,
  active = false,
  onClick,
  badge,
  collapsed = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 w-full select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'text-white bg-brand-500/16 border border-brand-500/30 shadow-sm shadow-brand-500/10'
          : 'text-slate-400 hover:text-white hover:bg-white/7 border border-transparent',
        collapsed && 'justify-center px-2',
        className
      )}
    >
      <span className={cn('shrink-0 transition-colors', active ? 'text-brand-400' : 'text-slate-400')}>
        {icon}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}

      {!collapsed && badge !== undefined && (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-brand-500/20 text-brand-400">
          {badge}
        </span>
      )}

      {collapsed && active && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-brand-500" />}
    </button>
  );
};
