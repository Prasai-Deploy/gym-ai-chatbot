import React from 'react';
import { motion } from 'motion/react';
import { Tooltip } from '../components/Tooltip';
import {
  Dumbbell,
  Bot,
  Flame,
  PieChart,
  TrendingUp,
  CreditCard,
  User,
  Users,
  Shield,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
} from '../icons';
import { cn } from '../tokens';

export interface SidebarNavRoute {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
  section?: 'main' | 'business' | 'system';
  requiredRole?: string[];
}

export interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (path: string) => void;
  userRole?: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentPath,
  collapsed,
  onToggleCollapse,
  onNavigate,
  userRole = 'member',
  className,
}) => {
  const isStaffOrOwner = ['owner', 'admin', 'trainer', 'staff', 'manager'].some((r) =>
    userRole.toLowerCase().includes(r)
  );

  const mainRoutes: SidebarNavRoute[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/v3/dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'coach', label: 'AI Coach', path: '/v3/coach', icon: <Bot className="w-4 h-4" />, badge: 'TRINITY' },
    { id: 'workout', label: 'Workouts', path: '/v3/workout', icon: <Flame className="w-4 h-4" /> },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition', icon: <PieChart className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', path: '/v3/progress', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const businessRoutes: SidebarNavRoute[] = [
    { id: 'overview', label: 'Overview', path: '/admin', icon: <Shield className="w-4 h-4" /> },
    { id: 'members', label: 'Members', path: '/v3/members', icon: <Users className="w-4 h-4" /> },
    { id: 'trainers', label: 'Trainers', path: '/v3/trainers', icon: <User className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', path: '/v3/attendance', icon: <Calendar className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', path: '/v3/billing', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const systemRoutes: SidebarNavRoute[] = [
    { id: 'profile', label: 'Profile', path: '/v3/profile', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const renderNavGroup = (title: string, routes: SidebarNavRoute[]) => (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <span className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] font-sans select-none">
          {title}
        </span>
      )}
      {routes.map((route) => {
        const isActive = currentPath === route.path || (route.path !== '/v3/dashboard' && route.path !== '/admin' && currentPath.startsWith(route.path));
        
        const navButton = (
          <button
            key={route.id}
            type="button"
            onClick={() => onNavigate(route.path)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 w-full select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
              isActive
                ? 'text-white bg-[#181C28] border border-orange-500/30 shadow-sm shadow-orange-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent',
              collapsed && 'justify-center px-0'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeSidebarIndicator"
                className="absolute left-0 w-1 h-5 bg-orange-500 rounded-r-full shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}

            <span className={cn('shrink-0 transition-colors', isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-200')}>
              {route.icon}
            </span>

            {!collapsed && (
              <span className="truncate text-left flex-1 font-sans tracking-tight">{route.label}</span>
            )}

            {!collapsed && route.badge !== undefined && (
              <span
                className={cn(
                  'ml-auto px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md',
                  route.badge === 'TRINITY'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                )}
              >
                {route.badge}
              </span>
            )}
          </button>
        );

        if (collapsed) {
          return (
            <Tooltip key={route.id} content={route.label} position="right">
              {navButton}
            </Tooltip>
          );
        }

        return navButton;
      })}
    </div>
  );

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col justify-between border-r border-white/[0.07] bg-[#090B10]/95 backdrop-blur-xl p-3.5 transition-all duration-300 relative z-30 select-none shrink-0',
        collapsed ? 'w-[72px]' : 'w-64',
        className
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className={cn('flex items-center gap-3 px-1 py-1', collapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/25 shrink-0 border border-orange-400/30">
            <Dumbbell className="w-4 h-4 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white font-display">STRIVA</span>
              <span className="text-[9px] font-bold text-orange-400 uppercase tracking-[0.16em]">OS v4.0</span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-5 overflow-y-auto no-scrollbar">
          {renderNavGroup('Main', mainRoutes)}
          {isStaffOrOwner && renderNavGroup('Business', businessRoutes)}
          {renderNavGroup('System', systemRoutes)}
        </nav>
      </div>

      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Collapse Rail</span>
          </div>
        )}
      </button>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
