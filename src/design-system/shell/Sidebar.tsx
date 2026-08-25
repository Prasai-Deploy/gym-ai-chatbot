import React from 'react';
import { NavigationItem } from '../components/NavigationItem';
import { Dumbbell, Bot, Flame, PieChart, TrendingUp, CreditCard, User, ChevronLeft, ChevronRight } from '../icons';
import { cn } from '../tokens';
import { BrandMark } from '../brand/BrandMark';

export interface SidebarNavRoute {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (path: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentPath,
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}) => {
  const routes: SidebarNavRoute[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/v3/dashboard', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'workout', label: 'Workouts', path: '/v3/workout', icon: <Flame className="w-4 h-4" /> },
    { id: 'coach', label: 'AI Coach', path: '/v3/coach', icon: <Bot className="w-4 h-4" />, badge: 'AI' },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition', icon: <PieChart className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', path: '/v3/progress', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', path: '/v3/billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', path: '/v3/profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={cn(
        'glass-nav hidden md:flex flex-col justify-between p-3.5 transition-[width] duration-200 relative z-30 select-none m-3 mr-0 h-[calc(100vh-1.5rem)] sticky top-3 rounded-[28px]',
        collapsed ? 'w-[76px]' : 'w-64 lg:w-72',
        className
      )}
    >
      <div className="flex flex-col gap-7 min-h-0">
        {/* Brand Header */}
        <div className={cn('flex items-center gap-3 px-2', collapsed && 'justify-center')}>
          {/* The "Fitness AI v4" tagline was STRIVA-specific; a white-labelled
              gym has no use for it. */}
          <BrandMark size="md" showWordmark={!collapsed} />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {routes.map((route) => (
            <NavigationItem
              key={route.id}
              label={route.label}
              icon={route.icon}
              active={currentPath === route.path || currentPath.startsWith(route.path)}
              onClick={() => onNavigate(route.path)}
              badge={route.badge}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <div className="flex items-center gap-2 text-xs font-semibold"><ChevronLeft className="w-4 h-4" /> Compact sidebar</div>}
      </button>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
