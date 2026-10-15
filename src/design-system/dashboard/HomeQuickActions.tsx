import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Play, Bot, Droplets, PieChart, Sparkles } from '../icons';
import { cn } from '../tokens';

export interface HomeQuickActionsProps {
  onNavigateWorkout: () => void;
  onNavigateCoach: () => void;
  onNavigateNutrition: () => void;
  onLogWater: () => void;
  isLoggingWater?: boolean;
  className?: string;
}

export const HomeQuickActions: React.FC<HomeQuickActionsProps> = React.memo(({
  onNavigateWorkout,
  onNavigateCoach,
  onNavigateNutrition,
  onLogWater,
  isLoggingWater = false,
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans px-1">
        QUICK ACTIONS
      </span>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={onNavigateWorkout}
          className="p-4 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-[#84CC16]/40 hover:bg-[#84CC16]/[0.04] transition-all flex flex-col items-center justify-center gap-2 group select-none"
        >
          <div className="p-2.5 rounded-xl bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 fill-current" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight font-sans">Start Workout</span>
        </button>

        <button
          type="button"
          onClick={onNavigateCoach}
          className="p-4 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-all flex flex-col items-center justify-center gap-2 group select-none"
        >
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight font-sans">Ask TRINETRA</span>
        </button>

        <button
          type="button"
          onClick={onLogWater}
          disabled={isLoggingWater}
          className="p-4 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all flex flex-col items-center justify-center gap-2 group select-none disabled:opacity-50"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
            <Droplets className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight font-sans">Log Water (+250)</span>
        </button>

        <button
          type="button"
          onClick={onNavigateNutrition}
          className="p-4 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all flex flex-col items-center justify-center gap-2 group select-none"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight font-sans">Log Meal</span>
        </button>
      </div>

      {/* TRINETRA Guidance Section */}
      <Card
        variant="default"
        onClick={onNavigateCoach}
        className="mt-2 p-5 rounded-2xl bg-[#0F131E] border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-sans">
              NEED GUIDANCE?
            </span>
            <p className="text-xs sm:text-sm text-slate-200 font-medium font-sans">
              Ask TRINETRA for workout recommendations, recovery advice, or nutrition guidance.
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" className="shrink-0 gap-1.5 text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
          <span>Ask TRINETRA</span>
          <Bot className="w-3.5 h-3.5" />
        </Button>
      </Card>
    </div>
  );
});

HomeQuickActions.displayName = 'HomeQuickActions';
