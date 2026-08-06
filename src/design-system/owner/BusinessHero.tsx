import React from 'react';
import { Badge } from '../components/Badge';
import { CreditCard, Activity, Sparkles, Building } from '../icons';
import { cn } from '../tokens';

export interface BusinessHeroProps {
  facilityName?: string;
  monthlyRevenueMrr?: number;
  activeMembers?: number;
  occupancyCount?: number;
  occupancyMax?: number;
  className?: string;
}

export const BusinessHero: React.FC<BusinessHeroProps> = React.memo(({
  facilityName = 'STRIVA Metro Flagship',
  monthlyRevenueMrr = 48250,
  activeMembers = 1240,
  occupancyCount = 142,
  occupancyMax = 200,
  className,
}) => {
  const capacityPct = Math.round((occupancyCount / occupancyMax) * 100);

  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="sm" icon={<Building className="w-3.5 h-3.5" />}>
            BUSINESS OS ACTIVE
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY BUSINESS INTELLIGENCE
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          {facilityName} 🏢
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Monthly Recurring Revenue is <span className="text-emerald-400 font-bold">${monthlyRevenueMrr.toLocaleString()} MRR</span> (+8.4% MoM). Gym floor capacity is at <span className="text-amber-400 font-bold">{capacityPct}% occupancy</span> ({occupancyCount}/{occupancyMax} members on floor).
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <CreditCard className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross MRR</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">${(monthlyRevenueMrr / 1000).toFixed(1)}k</span>
            <span className="text-xs text-emerald-400 font-bold">/ mo</span>
          </div>
          <span className="text-[10px] text-slate-400">{activeMembers} Active Subscriptions</span>
        </div>
      </div>
    </div>
  );
});

BusinessHero.displayName = 'BusinessHero';
