import React from 'react';
import { cn } from '../../../lib/utils';
import { NavLink } from 'react-router-dom';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  onClick?: () => void;
  isFab?: boolean;
}

export interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  items: BottomNavItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export const BottomNavigation = React.forwardRef<HTMLDivElement, BottomNavigationProps>(
  ({ className, items, activeTab, onTabChange, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg z-50',
          'bg-slate-950/85 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-1.5 shadow-2xl shadow-black/60',
          className
        )}
        id="bottom-nav"
        {...props}
      >
        <div className="flex items-center justify-around w-full relative">
          {items.map((item) => {
            if (item.isFab) {
              return (
                <div key={item.id} className="relative -top-5 flex flex-col items-center">
                  <button
                    className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 hover:scale-105 active:scale-95 transition-all border border-brand-400/40"
                    onClick={item.onClick}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    {item.label}
                  </span>
                </div>
              );
            }

            const isActive = activeTab === item.id;
            const handleClick = () => {
              item.onClick?.();
              onTabChange?.(item.id);
            };

            const content = (
              <div className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all">
                <div className={cn('transition-all duration-200', isActive ? 'text-brand-400 scale-110' : 'text-slate-500 hover:text-slate-300')}>
                  {item.icon}
                </div>
                <span className={cn('text-[10px] font-semibold tracking-wide transition-all', isActive ? 'text-white font-bold' : 'text-slate-500')}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-sm shadow-brand-500 animate-pulse mt-0.5" />
                )}
              </div>
            );

            if (item.to) {
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className="flex-1 flex justify-center focus:outline-none"
                  onClick={handleClick}
                >
                  {content}
                </NavLink>
              );
            }

            return (
              <button
                key={item.id}
                onClick={handleClick}
                className="flex-1 flex justify-center focus:outline-none"
                aria-label={item.label}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);
BottomNavigation.displayName = 'BottomNavigation';
