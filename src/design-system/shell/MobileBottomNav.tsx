import React from 'react';
import { Dumbbell, Bot, Flame, PieChart, User } from '../icons';
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
    { id: 'dashboard', label: 'Home', path: '/v3/dashboard', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'workout', label: 'Workouts', path: '/v3/workout', icon: <Flame className="w-5 h-5" /> },
    { id: 'coach', label: 'AI Coach', path: '/v3/coach', icon: <Bot className="w-5 h-5" /> },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition', icon: <PieChart className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', path: '/v3/profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav aria-label="Mobile bottom navigation" className="glass-nav md:hidden fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-2.5 right-2.5 z-40 rounded-[24px] px-1.5 py-1.5 flex items-center justify-around select-none">
      {items.map((item) => {
        const isActive = currentPath === item.path || currentPath.startsWith(item.path);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-2 rounded-[18px] transition-all duration-200 min-w-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 touch-manipulation',
              isActive ? 'text-brand-400 font-bold bg-brand-500/10' : 'text-slate-400 font-medium hover:text-white hover:bg-white/5'
            )}
          >
            {item.icon}
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
