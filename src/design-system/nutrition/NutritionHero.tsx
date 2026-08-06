import React from 'react';
import { Badge } from '../components/Badge';
import { Sparkles, Activity } from '../icons';
import { cn } from '../tokens';

export interface NutritionHeroProps {
  userName?: string;
  nutritionScore?: number;
  readinessScore?: number;
  className?: string;
}

export const NutritionHero: React.FC<NutritionHeroProps> = React.memo(({
  userName = 'Alex',
  nutritionScore = 88,
  readinessScore = 88,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" icon={<Activity className="w-3.5 h-3.5" />}>
            DIET ADHERENCE: {nutritionScore}%
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY DIET ENGINE
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Nutrition & Recovery, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">{userName}</span> 🥗
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          You have achieved <span className="text-white font-bold">{nutritionScore}% of your macronutrient targets</span> today. Trinity AI has optimized your post-workout anabolic window.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Activity className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recovery Readiness</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{readinessScore}</span>
            <span className="text-xs text-emerald-400 font-bold">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-400">Peak Anabolic State</span>
        </div>
      </div>
    </div>
  );
});

NutritionHero.displayName = 'NutritionHero';
