import React from 'react';
import { NavigationItem } from '../components/NavigationItem';
import { Dumbbell, Bot, Flame, PieChart, TrendingUp, CreditCard, User, ChevronLeft, ChevronRight } from '../icons';
import { cn } from '../tokens';

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
        'hidden md:flex flex-col justify-between border-r border-white/10 bg-slate-950/80 backdrop-blur-xl p-4 transition-all duration-300 relative z-30 select-none',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className={cn('flex items-center gap-3 px-2', collapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 shrink-0">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white font-display">STRIVA</span>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Fitness AI v4</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
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
        className="w-full flex items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <div className="flex items-center gap-2 text-xs font-semibold"><ChevronLeft className="w-4 h-4" /> Collapsed View</div>}
      </button>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
