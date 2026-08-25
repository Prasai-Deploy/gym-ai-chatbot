import React from 'react';
import { User, Shield } from '../icons';
import { cn } from '../tokens';

export interface MinimalProfileHeroProps {
  userName?: string;
  email?: string;
  role?: string;
  memberSinceYear?: number;
  avatarUrl?: string;
  className?: string;
}

export const MinimalProfileHero: React.FC<MinimalProfileHeroProps> = React.memo(({
  userName = 'Athlete',
  email = 'athlete@striva.app',
  role = 'PRO Member',
  memberSinceYear = 2026,
  avatarUrl,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Subtle Minimal Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-indigo-500/20 border border-white/[0.08] flex items-center justify-center text-white font-bold text-lg font-display shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
              {userName}
            </h1>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              {role}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-sans">{email}</span>
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-400 self-start sm:self-center">
        Member since {memberSinceYear}
      </div>
    </div>
  );
});

MinimalProfileHero.displayName = 'MinimalProfileHero';
