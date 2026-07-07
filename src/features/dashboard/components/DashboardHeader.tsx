import React from 'react';
import { Dumbbell, LogOut } from 'lucide-react';
import { ThemeToggle } from '../../../components/ThemeToggle';

interface DashboardHeaderProps {
  user: any;
  onShowProfile: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onShowProfile, onLogout }) => {
  return (
    <header className="p-4 sm:p-6 flex justify-between items-center sticky top-0 z-40 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex flex-shrink-0 items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
          <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#121212' }} />
        </div>
        <div className="min-w-0 flex-shrink">
          <h2 className="font-bold text-sm sm:text-lg leading-tight uppercase tracking-widest truncate" style={{ color: 'var(--accent-primary)' }}>STRIVA</h2>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* --- START FEATURE: THEME TOGGLE --- */}
        <ThemeToggle />
        {/* --- END FEATURE: THEME TOGGLE --- */}
        <div className="flex items-center gap-3">
          <button onClick={onShowProfile} className="hover:scale-105 transition-transform">
            <img src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'} className="w-8 h-8 rounded-full" style={{ border: '1px solid var(--border-subtle)' }} alt={user?.name || 'User'} />
          </button>
          <button onClick={onLogout} className="p-2 rounded-full hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
