import React from 'react';
import { Badge } from '../components/Badge';
import { Shield, Sparkles, Activity, Users } from '../icons';
import { cn } from '../tokens';

export interface AttendanceHeroProps {
  occupancyCount?: number;
  maxCapacity?: number;
  totalCheckinsToday?: number;
  className?: string;
}

export const AttendanceHero: React.FC<AttendanceHeroProps> = React.memo(({
  occupancyCount = 142,
  maxCapacity = 200,
  totalCheckinsToday = 680,
  className,
}) => {
  const capacityPct = Math.round((occupancyCount / maxCapacity) * 100);

  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" icon={<Shield className="w-3.5 h-3.5" />}>
            FRONT DESK OPERATING SYSTEM
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TURNSTILE ACCESS CONTROL
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Front Desk & Live Occupancy 🏛️
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Currently <span className="text-white font-bold">{occupancyCount} members inside</span> ({capacityPct}% floor capacity). Total check-ins today: <span className="text-emerald-400 font-bold">{totalCheckinsToday} members</span>.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Users className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Occupancy</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{occupancyCount}</span>
            <span className="text-xs text-slate-400">/ {maxCapacity} Max</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Normal Floor Capacity</span>
        </div>
      </div>
    </div>
  );
});

AttendanceHero.displayName = 'AttendanceHero';
