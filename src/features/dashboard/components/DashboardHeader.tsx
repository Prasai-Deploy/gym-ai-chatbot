import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogOut, Bell, Flame, Shield, CreditCard } from 'lucide-react';
import { ThemeToggle } from '../../../components/ThemeToggle';

interface DashboardHeaderProps {
  user: any;
  onShowProfile: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onShowProfile, onLogout }) => {
  const navigate = useNavigate();

  return (
    <header className="px-4 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 transform hover:rotate-6 transition-all cursor-pointer" onClick={() => navigate('/dashboard')}>
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-display">STRIVA</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
              v2 PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">AI-Powered SaaS Fitness Engine</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Streak Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-sm">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
          <span>7 Day Streak</span>
        </div>

        {/* Pricing/Billing Direct Trigger */}
        <button 
          onClick={() => navigate('/pricing')}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-orange-400 hover:border-orange-500/40 transition-all"
          title="Subscription & Billing"
        >
          <CreditCard className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-slate-950" />
        </button>

        <ThemeToggle />

        {/* User Profile Avatar with Glowing Ring */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <button 
            onClick={onShowProfile} 
            className="relative group p-0.5 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 shadow-md transition-all hover:scale-105"
            title="Profile & Settings"
          >
            <img 
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member'} 
              className="w-8 h-8 rounded-full bg-slate-900 object-cover" 
              alt={user?.name || 'Member Profile'} 
            />
          </button>
          
          <button 
            onClick={onLogout} 
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" 
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
