import React from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Flame, Play, Bot, CheckCircle2, Calendar } from '../icons';
import { cn } from '../tokens';

export interface TodayFocusProps {
  activeSession?: any;
  latestPlan?: any;
  onStartWorkout: () => void;
  onOpenCoach: () => void;
  className?: string;
}

export const TodayFocus: React.FC<TodayFocusProps> = React.memo(({
  activeSession,
  latestPlan,
  onStartWorkout,
  onOpenCoach,
  className,
}) => {
  const hasActiveSession = Boolean(activeSession);
  const hasPlan = Boolean(latestPlan);

  // Determine state
  const title = hasActiveSession
    ? activeSession.title || activeSession.workoutTitle || 'Workout In Progress'
    : hasPlan
    ? latestPlan.title || latestPlan.name || 'Today’s Workout'
    : 'Rest & Recovery Day';

  const subtitle = hasActiveSession
    ? 'You have a workout in progress. Ready to jump back in?'
    : hasPlan
    ? 'Your planned workout for today is ready.'
    : 'No workout scheduled today. Rest, do light stretching, or ask TRINETRA for advice.';

  const actionLabel = hasActiveSession
    ? 'Resume Workout'
    : hasPlan
    ? 'Start Workout'
    : 'View Workouts';

  return (
    <Card
      variant="glass"
      className={cn(
        'w-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#11141D] shadow-xl relative overflow-hidden flex flex-col justify-between gap-6',
        className
      )}
    >
      {/* Background Accent glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#84CC16]/[0.06] rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/25 text-[#84CC16]">
              <Flame className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#84CC16] font-sans">
              TODAY'S NEXT STEP
            </span>
          </div>

          {hasActiveSession ? (
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              In Progress
            </span>
          ) : hasPlan ? (
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#84CC16] bg-[#84CC16]/10 border border-[#84CC16]/25 rounded-full flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Scheduled
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 rounded-full">
              Rest Day
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-sm text-slate-300 font-sans leading-relaxed max-w-xl">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Primary Action Row - Minimum 48px height touch targets */}
      <div className="flex flex-wrap items-center gap-3 relative z-10 pt-2 border-t border-white/[0.06]">
        <Button
          variant="lime"
          size="lg"
          onClick={onStartWorkout}
          className="min-h-[48px] px-6 text-sm font-bold gap-2 shadow-lg shadow-[#84CC16]/20"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{actionLabel}</span>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenCoach}
          className="min-h-[48px] px-5 text-sm font-semibold gap-2 text-slate-300 hover:text-white border border-white/10"
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Ask TRINETRA</span>
        </Button>
      </div>
    </Card>
  );
});

TodayFocus.displayName = 'TodayFocus';
