import React from 'react';
import { Badge } from '../components/Badge';
import { Users, Sparkles, AlertTriangle, ShieldCheck } from '../icons';
import { cn } from '../tokens';

export interface MemberHeroProps {
  totalMembers?: number;
  avgHealthScore?: number;
  churnRiskCount?: number;
  className?: string;
}

export const MemberHero: React.FC<MemberHeroProps> = React.memo(({
  totalMembers = 1240,
  avgHealthScore = 88,
  churnRiskCount = 14,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm" icon={<Users className="w-3.5 h-3.5" />}>
            CUSTOMER SUCCESS PLATFORM
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY RETENTION ENGINE
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Member Directory & Retention OS 👥
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Managing <span className="text-white font-bold">{totalMembers.toLocaleString()} active members</span>. Average health score is <span className="text-emerald-400 font-bold">{avgHealthScore}%</span>. <span className="text-amber-400 font-bold">{churnRiskCount} members flagged</span> for retention review.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Churn Risk Alerts</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{churnRiskCount}</span>
            <span className="text-xs text-amber-400 font-bold">Members</span>
          </div>
          <span className="text-[10px] text-slate-400">96.2% Annual Retention</span>
        </div>
      </div>
    </div>
  );
});

MemberHero.displayName = 'MemberHero';
