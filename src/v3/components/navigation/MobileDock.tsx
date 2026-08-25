import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, Sparkles, Activity, User, Plus } from 'lucide-react';

export const MobileDock: React.FC<{ onLogPress?: () => void }> = ({ onLogPress }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const DOCK_ITEMS = [
    { id: 'dashboard', label: 'Home', icon: <Home className="w-5 h-5" />, path: '/v3/dashboard' },
    { id: 'workout', label: 'Workout', icon: <Dumbbell className="w-5 h-5" />, path: '/v3/workout' },
    { id: 'log', label: 'Quick Log', icon: <Plus className="w-6 h-6" />, isFab: true },
    { id: 'coach', label: 'AI Coach', icon: <Sparkles className="w-5 h-5" />, path: '/v3/coach' },
    { id: 'progress', label: 'Progress', icon: <Activity className="w-5 h-5" />, path: '/v3/progress' },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg z-50 bg-[#131722]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 shadow-2xl shadow-black/80 font-sans">
      <div className="flex items-center justify-around w-full relative">
        {DOCK_ITEMS.map((item) => {
          if (item.isFab) {
            return (
              <div key={item.id} className="relative -top-5 flex flex-col items-center">
                <button
                  onClick={onLogPress || (() => navigate('/v3/workout'))}
                  className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 hover:scale-105 active:scale-95 transition-all border border-brand-400/40"
                  aria-label="Quick Action"
                >
                  {item.icon}
                </button>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                  {item.label}
                </span>
              </div>
            );
          }

          const isActive = location.pathname.startsWith(item.path!);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path!)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 transition-all focus:outline-none"
            >
              <div className={`transition-all duration-200 ${isActive ? 'text-brand-500 scale-110' : 'text-slate-500'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold tracking-wide mt-0.5 ${isActive ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-0.5 shadow-sm shadow-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
