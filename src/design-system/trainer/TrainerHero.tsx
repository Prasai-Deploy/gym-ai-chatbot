import React from 'react';
import { Badge } from '../components/Badge';
import { User, Sparkles, Activity, Clock } from '../icons';
import { cn } from '../tokens';

export interface TrainerHeroProps {
  trainerName?: string;
  activeClientsCount?: number;
  pendingCheckInsCount?: number;
  sessionsTodayCount?: number;
  className?: string;
}

export const TrainerHero: React.FC<TrainerHeroProps> = React.memo(({
  trainerName = 'Coach Elena',
  activeClientsCount = 24,
  pendingCheckInsCount = 3,
  sessionsTodayCount = 5,
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
          <Badge variant="primary" size="sm" icon={<Activity className="w-3.5 h-3.5" />}>
            TRAINER OS COPILOT
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY COACH ASSIST
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-400">{trainerName}</span> 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          You have <span className="text-amber-400 font-bold">{pendingCheckInsCount} client check-ins pending</span> review and <span className="text-indigo-400 font-bold">{sessionsTodayCount} 1-on-1 PT sessions</span> scheduled today.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <User className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Client Roster</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{activeClientsCount}</span>
            <span className="text-xs text-indigo-400 font-bold">Members</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">96% Client Adherence</span>
        </div>
      </div>
    </div>
  );
});

TrainerHero.displayName = 'TrainerHero';
