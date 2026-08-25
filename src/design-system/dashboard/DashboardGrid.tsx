import React from 'react';
import { HealthScoreHero } from './HealthScoreHero';
import { TodayActionSection } from './TodayActionSection';
import { TrinityAssistantSection } from './TrinityAssistantSection';
import { cn } from '../tokens';

export interface DashboardGridProps {
  userName?: string;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = React.memo(({
  userName = 'Athlete',
  onNavigate = (path) => console.log('Dashboard navigate to:', path),
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

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8', className)}>
      {/* 1. Header Greeting */}
      <div className="flex flex-col gap-0.5 select-none">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          {getGreeting()}, {userName}
        </h1>
      </div>

      {/* 2. Primary Hero: Large Central Health Score & Supporting Metrics */}
      <HealthScoreHero
        score={88}
        recoveryScore={88}
        sleepScore={92}
        activityScore={84}
        headline="You're ready for a strong training day."
      />

      {/* 3. Today's Top Actions */}
      <TodayActionSection
        workoutName="Upper Body Push & Core"
        workoutDurationMin={52}
        caloriesLogged={2240}
        caloriesTarget={2650}
        proteinLoggedGrams={148}
        proteinTargetGrams={180}
        initialHydrationLiters={1.8}
        targetHydrationLiters={2.5}
        onStartWorkout={() => onNavigate('/v3/workout')}
        onOpenNutrition={() => onNavigate('/v3/nutrition')}
      />

      {/* 4. Quiet Trinity AI Recommendation */}
      <TrinityAssistantSection
        insightText="You're well recovered today. Keep intensity high on your main lifts and aim for 150g protein."
        onOpenCoach={() => onNavigate('/v3/coach')}
      />
    </div>
  );
});

DashboardGrid.displayName = 'DashboardGrid';
