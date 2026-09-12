import React from 'react';
import { motion } from 'motion/react';
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
        'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 w-full select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
        active
          ? 'text-white bg-orange-500/[0.12] border border-orange-500/30 shadow-sm shadow-orange-500/10 font-bold'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent',
        collapsed && 'justify-center px-2',
        className
      )}
    >
      {active && (
        <motion.div
          layoutId="activeNavIndicator"
          className="absolute left-0 w-1 h-5 bg-orange-500 rounded-r-full"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}

      <span className={cn('shrink-0 transition-colors', active ? 'text-orange-400' : 'text-slate-400')}>
        {icon}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}

      {!collapsed && badge !== undefined && (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/20 text-orange-400">
          {badge}
        </span>
      )}
    </button>
  );
};
