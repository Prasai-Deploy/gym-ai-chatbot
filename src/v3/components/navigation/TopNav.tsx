import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, Flame, Bell, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', path: '/v3/dashboard' },
    { id: 'workout', label: 'Workout', path: '/v3/workout' },
    { id: 'coach', label: 'AI Coach', path: '/v3/coach' },
    { id: 'nutrition', label: 'Nutrition', path: '/v3/nutrition' },
    { id: 'progress', label: 'Progress', path: '/v3/progress' },
    { id: 'billing', label: 'Billing', path: '/v3/billing' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#090B10]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between font-sans">
      {/* Brand */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/v3/dashboard')}
      >
        <div className="w-9 h-9 rounded-xl bg-[#F97316] text-white flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xl tracking-tight text-white font-display">STRIVA</span>
          <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest">v3 ENGINE</span>
        </div>
      </div>

      {/* Desktop Links */}
      <nav className="hidden md:flex items-center gap-1 bg-[#131722] p-1.5 rounded-2xl border border-white/10">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#F97316] text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Actions & Avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold">
          <Flame className="w-4 h-4 fill-amber-400" />
          <span>7d Streak</span>
        </div>

        <button className="p-2 rounded-xl bg-[#131722] border border-white/10 text-slate-400 hover:text-white transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F97316]" />
        </button>

        <button 
          onClick={() => navigate('/v3/profile')}
          className="w-9 h-9 rounded-full bg-[#1A2030] border border-white/15 flex items-center justify-center text-slate-200 hover:border-orange-500 transition-colors"
          title="Profile & Settings"
        >
          {user?.avatar ? (
            <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="User" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
