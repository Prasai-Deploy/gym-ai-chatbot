import React from 'react';
import { motion } from 'motion/react';
import { Building, TrendingUp, Users, Activity } from '../icons';
import { cn } from '../tokens';

export interface MinimalOwnerHeroProps {
  facilityName?: string;
  monthlyRevenueMrr?: number;
  activeMembers?: number;
  todayCheckins?: number;
  activeTrainers?: number;
  statusHeadline?: string;
  className?: string;
}

export const MinimalOwnerHero: React.FC<MinimalOwnerHeroProps> = React.memo(({
  facilityName = 'STRIVA Metro Flagship',
  monthlyRevenueMrr = 48250,
  activeMembers = 1240,
  todayCheckins = 680,
  activeTrainers = 12,
  statusHeadline = "Facility operations are performing 12% above monthly target.",
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-6 select-none shadow-sm',
        className
      )}
    >
      {/* Top Facility Badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/[0.08] border border-orange-500/20 text-orange-400">
        <Building className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] font-sans">
          {facilityName}
        </span>
      </div>

      {/* Central Revenue Metric */}
      <div className="flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-4xl sm:text-6xl font-extrabold text-white font-display tracking-tight leading-none tabular-nums"
        >
          ${monthlyRevenueMrr.toLocaleString()}
        </motion.span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-1.5 font-sans">
          Monthly Recurring Revenue (MRR)
        </span>
      </div>

      {/* Main Operational Headline */}
      <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug max-w-md">
        {statusHeadline}
      </p>

      {/* 3 Supporting Metrics: Members, Check-ins, Staff */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg pt-5 border-t border-white/[0.06]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Active Members</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {activeMembers.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium">Today's Check-ins</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {todayCheckins}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Trainers On Duty</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-display tabular-nums">
            {activeTrainers}
          </span>
        </div>
      </div>
    </div>
  );
});

MinimalOwnerHero.displayName = 'MinimalOwnerHero';
