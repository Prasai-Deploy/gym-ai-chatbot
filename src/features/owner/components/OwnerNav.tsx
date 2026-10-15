import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Dumbbell,
  BarChart3,
  CreditCard,
  Settings,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  active: boolean;
  comingSoonPhase?: string;
}

export const OwnerNav: React.FC = () => {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/owner/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'advisor',
      label: 'AI Advisor',
      path: '/owner/advisor',
      icon: <Sparkles className="w-4 h-4 text-orange-400" />,
      active: true,
    },
    {
      id: 'members',
      label: 'Members',
      path: '/owner/members',
      icon: <Users className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/owner/attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'trainers',
      label: 'Trainers',
      path: '/owner/trainers',
      icon: <Dumbbell className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/owner/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'billing',
      label: 'Gym Billing',
      path: '/owner/billing',
      icon: <CreditCard className="w-4 h-4" />,
      active: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/owner/settings',
      icon: <Settings className="w-4 h-4" />,
      active: false,
      comingSoonPhase: 'Roadmap',
    },
  ];

  return (
    <nav
      aria-label="Gym Owner Navigation"
      className="w-full bg-[#07090E] border-b border-white/[0.06] px-4 sm:px-6 overflow-x-auto scrollbar-none"
    >
      <div className="flex items-center gap-1 sm:gap-2 py-2 min-w-max">
        {navItems.map((item) => {
          if (item.active) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          }

          return (
            <div
              key={item.id}
              className="group relative flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium text-slate-500 cursor-not-allowed select-none opacity-60 hover:opacity-80 transition-opacity"
              title={`${item.label} — Scheduled for ${item.comingSoonPhase}`}
              role="button"
              aria-disabled="true"
              tabIndex={-1}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.comingSoonPhase && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08] tracking-wider uppercase">
                  {item.comingSoonPhase}
                </span>
              )}
            </div>
          );
        })}

        {/* Separator and switch back to Member Experience */}
        <div className="h-5 w-[1px] bg-white/[0.1] mx-2" />

        <NavLink
          to="/v3/dashboard"
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <span>Member App</span>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </NavLink>
      </div>
    </nav>
  );
};
