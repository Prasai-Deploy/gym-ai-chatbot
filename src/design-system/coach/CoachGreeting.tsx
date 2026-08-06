import React from 'react';
import { Badge } from '../components/Badge';
import { Bot, Sparkles, Activity } from '../icons';
import { cn } from '../tokens';

export interface CoachGreetingProps {
  userName?: string;
  readinessScore?: number;
  activeGoal?: string;
  className?: string;
}

export const CoachGreeting: React.FC<CoachGreetingProps> = React.memo(({
  userName = 'Alex',
  readinessScore = 88,
  activeGoal = 'Hypertrophy & Strength',
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col gap-4 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY AI 400B
          </Badge>
          <Badge variant="success" size="sm" icon={<Activity className="w-3.5 h-3.5" />}>
            {readinessScore}% READINESS
          </Badge>
        </div>
        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Context: {activeGoal}</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/20">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Hello {userName}, I am your Trinity AI Coach 🏋️‍♂️
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            "Your CNS is <span className="text-emerald-400 font-bold">{readinessScore}% recovered</span> today. What would you like to optimize in your training or nutrition?"
          </p>
        </div>
      </div>
    </div>
  );
});

CoachGreeting.displayName = 'CoachGreeting';
