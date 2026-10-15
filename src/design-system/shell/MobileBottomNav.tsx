import React from 'react';
import { motion } from 'motion/react';
import { Dumbbell, Bot, Flame, PieChart, TrendingUp, User } from '../icons';
import { cn } from '../tokens';

export interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(({
  currentPath,
  onNavigate,
}) => {
  const items = [
    { id: 'dashboard', label: 'Home', path: '/v3/dashboard', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'coach', label: 'Coach', path: '/v3/coach', icon: <Bot className="w-4 h-4" /> },
    { id: 'workout', label: 'Workout', path: '/v3/workout', icon: <Flame className="w-4 h-4" /> },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition', icon: <PieChart className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', path: '/v3/progress', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', path: '/v3/profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090B10]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 py-1.5 pb-safe flex items-center justify-around select-none shadow-2xl"
    >
      {items.map((item) => {
        const isActive = currentPath === item.path || (item.path !== '/v3/dashboard' && currentPath.startsWith(item.path));
        const isCoach = item.id === 'coach';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[56px] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B10]',
              isCoach ? 'focus-visible:ring-indigo-500' : 'focus-visible:ring-lime-500',
              isActive
                ? isCoach
                  ? 'text-indigo-300 font-bold'
                  : 'text-lime-400 font-bold'
                : 'text-slate-400 font-medium hover:text-white'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavPill"
                className={cn(
                  'absolute inset-0 rounded-xl border shadow-sm',
                  isCoach
                    ? 'bg-indigo-500/[0.12] border-indigo-500/30 shadow-indigo-500/10'
                    : 'bg-lime-500/[0.10] border-lime-500/25 shadow-lime-500/10'
                )}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}

            <span className={cn('relative z-10', isActive && (isCoach ? 'text-indigo-300' : 'text-lime-400'))}>
              {item.icon}
            </span>
            <span className="relative z-10 text-[10px] font-bold tracking-tight uppercase font-sans">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
