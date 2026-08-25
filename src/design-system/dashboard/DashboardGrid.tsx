import React from 'react';
import { DashboardHero } from './DashboardHero';
import { RecoveryCard } from './RecoveryCard';
import { MissionCard } from './MissionCard';
import { CoachRecommendation } from './CoachRecommendation';
import { DailyProgress } from './DailyProgress';
import { MacroOverview } from './MacroOverview';
import { HydrationCard } from './HydrationCard';
import { QuickActions } from './QuickActions';
import { ScheduleTimeline } from './ScheduleTimeline';
import { WeeklyStreak } from './WeeklyStreak';
import { AchievementsCarousel } from './AchievementsCarousel';
import { ActivityFeed } from './ActivityFeed';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface DashboardGridProps {
  userName?: string;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = React.memo(({
  userName = 'Alex',
  onNavigate = (path: string) => console.log('Dashboard navigate to:', path),
  className,
}) => {
  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Greeting & Readiness Hero */}
      <DashboardHero
        userName={userName}
        readinessScore={88}
        streakDays={7}
        onStartWorkout={() => onNavigate('/v3/workout')}
      />

      {/* 2. Quick Actions Bar */}
      <QuickActions
        onLogWorkout={() => onNavigate('/v3/workout')}
        onAskCoach={() => onNavigate('/v3/coach')}
        onLogNutrition={() => onNavigate('/v3/nutrition')}
        onRecordWeight={() => onNavigate('/v3/profile')}
      />

      {/* 3. Primary Mission & Recovery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MissionCard
          onStartMission={() => onNavigate('/v3/workout')}
          className="lg:col-span-2"
        />
        <RecoveryCard score={88} hrvMs={74} sleepHours={7.8} strainScore={14.2} />
      </div>

      {/* 4. AI Coach Recommendation & Daily Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CoachRecommendation
          onOpenCoach={() => onNavigate('/v3/coach')}
          className="lg:col-span-1"
        />
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DailyProgress caloriesBurned={1850} activeMinutes={55} workoutsLogged={1} />
          <WeeklyStreak streakCount={7} />
        </div>
      </div>

      {/* 5. Nutrition & Hydration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MacroOverview className="lg:col-span-2" />
        <HydrationCard initialLiters={2.2} targetLiters={3.5} />
      </div>

      {/* 6. Schedule & Activity Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleTimeline />
        <ActivityFeed />
      </div>

      {/* 7. Achievements Carousel */}
      <AchievementsCarousel />
    </PageContainer>
  );
});

DashboardGrid.displayName = 'DashboardGrid';
