import React, { useState } from 'react';
import { Sliders, Sun, Moon, Bell } from '../icons';
import { useTheme } from '../ThemeProvider';
import { cn } from '../tokens';

export interface ProfilePreferencesProps {
  className?: string;
}

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = React.memo(({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          PREFERENCES
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.05]">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between py-2.5 min-h-[44px]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">Appearance Theme</span>
            <span className="text-[11px] text-slate-400">Current visual mode</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>

        {/* Units Toggle */}
        <div className="flex items-center justify-between py-2.5 min-h-[44px]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">Measurement Units</span>
            <span className="text-[11px] text-slate-400">Used across workouts and metrics</span>
          </div>
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setUnits('metric')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                units === 'metric' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              Metric (kg/cm)
            </button>
            <button
              type="button"
              onClick={() => setUnits('imperial')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                units === 'imperial' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              Imperial (lbs/in)
            </button>
          </div>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between py-2.5 min-h-[44px]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">Daily Workout & Hydration Alerts</span>
            <span className="text-[11px] text-slate-400">Push reminders from Trinity</span>
          </div>
          <button
            type="button"
            onClick={() => setNotifications(!notifications)}
            className={cn(
              'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              notifications
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{notifications ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ProfilePreferences.displayName = 'ProfilePreferences';
