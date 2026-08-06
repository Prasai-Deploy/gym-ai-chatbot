import React from 'react';
import { Badge } from '../components/Badge';
import { TrendingUp, Award, Sparkles } from '../icons';
import { cn } from '../tokens';

export interface ProgressHeroProps {
  userName?: string;
  healthScore?: number;
  strengthGainPct?: number;
  className?: string;
}

export const ProgressHero: React.FC<ProgressHeroProps> = React.memo(({
  userName = 'Alex',
  healthScore = 92,
  strengthGainPct = 14.5,
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
          <Badge variant="primary" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />}>
            +{strengthGainPct}% STRENGTH GROWTH
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY ANALYTICS
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Your Transformation, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-indigo-400">{userName}</span> 📈
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          You are <span className="text-white font-bold">14.5% stronger</span> than 30 days ago. Your cardiovascular efficiency and muscle density are trending upward.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <Award className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Health Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{healthScore}</span>
            <span className="text-xs text-orange-400 font-bold">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Elite Tier Member</span>
        </div>
      </div>
    </div>
  );
});

ProgressHero.displayName = 'ProgressHero';
