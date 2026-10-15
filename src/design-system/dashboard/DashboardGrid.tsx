import React from 'react';
import { TodayFocus } from './TodayFocus';
import { StatusSummary } from './StatusSummary';
import { ConsistencySummary } from './ConsistencySummary';
import { cn } from '../tokens';

export interface DashboardGridProps {
  userName?: string;
  workoutData?: any;
  nutritionData?: any;
  progressData?: any;
  onLogWater: (amountMl: number) => void;
  isLoggingWater?: boolean;
  onNavigate: (path: string) => void;
  className?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = React.memo(({
  userName,
  workoutData,
  nutritionData,
  progressData,
  onLogWater,
  isLoggingWater = false,
  onNavigate,
  className,
}) => {
  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const greetingTitle = userName ? `${getGreeting()}, ${userName}` : 'Welcome back';

  const activeSession = workoutData?.activeSession;
  const latestPlan = workoutData?.latestPlan;

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 select-none', className)}>
      {/* Greeting Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          {greetingTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-sans">
          Here’s what matters today.
        </p>
      </div>

      {/* LEVEL 1: Primary Today Action */}
      <TodayFocus
        activeSession={activeSession}
        latestPlan={latestPlan}
        onStartWorkout={() => onNavigate('/v3/workout')}
        onOpenCoach={() => onNavigate('/v3/coach')}
      />

      {/* LEVEL 2: Daily Tracking */}
      <StatusSummary
        nutritionData={nutritionData}
        onLogWater={onLogWater}
        isLoggingWater={isLoggingWater}
        onOpenNutrition={() => onNavigate('/v3/nutrition')}
      />

      {/* LEVEL 3: Recent Consistency */}
      <ConsistencySummary
        progressData={progressData}
        onOpenProgress={() => onNavigate('/v3/progress')}
      />
    </div>
  );
});

DashboardGrid.displayName = 'DashboardGrid';
