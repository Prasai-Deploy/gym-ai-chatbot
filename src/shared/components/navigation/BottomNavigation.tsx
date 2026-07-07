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
        className={cn('bottom-nav', className)}
        id="bottom-nav"
        {...props}
      >
        <div className="flex items-end justify-around max-w-lg mx-auto w-full">
          {items.map((item) => {
            if (item.isFab) {
              return (
                <div key={item.id} className="flex flex-col items-center flex-1">
                  <button
                    className="bottom-nav-fab"
                    onClick={item.onClick}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </button>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider mt-1 pb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
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
              <>
                {item.icon}
                <span>{item.label}</span>
                {isActive && (
                  <div
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: 'var(--accent-primary)' }}
                  />
                )}
              </>
            );

            if (item.to) {
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={({ isActive: isRouteActive }) =>
                    cn('bottom-nav-item', { active: isRouteActive || isActive })
                  }
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
                className={cn('bottom-nav-item', { active: isActive })}
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
