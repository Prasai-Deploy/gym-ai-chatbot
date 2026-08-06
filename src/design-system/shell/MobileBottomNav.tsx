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
    { id: 'dashboard', label: 'Dashboard', path: '/v3/dashboard', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'workout', label: 'Workouts', path: '/v3/workout', icon: <Flame className="w-5 h-5" /> },
    { id: 'coach', label: 'AI Coach', path: '/v3/coach', icon: <Bot className="w-5 h-5" /> },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition', icon: <PieChart className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', path: '/v3/profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav aria-label="Mobile Bottom Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around select-none">
      {items.map((item) => {
        const isActive = currentPath === item.path || currentPath.startsWith(item.path);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-200 min-w-[56px]',
              isActive ? 'text-orange-400 font-bold scale-105' : 'text-slate-400 font-medium hover:text-white'
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
