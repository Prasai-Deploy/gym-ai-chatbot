import React, { useState } from 'react';
import { ProgressHero } from './ProgressHero';
import { HealthScoreCard } from './HealthScoreCard';
import { StrengthChart } from './StrengthChart';
import { BodyMetrics } from './BodyMetrics';
import { BodyCompositionCard } from './BodyCompositionCard';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import { StreakCard } from './StreakCard';
import { PersonalRecords } from './PersonalRecords';
import { GoalProgress } from './GoalProgress';
import { AIInsightsCard } from './AIInsightsCard';
import { AchievementsTimeline } from './AchievementsTimeline';
import { WeeklySummary } from './WeeklySummary';
import { MonthlyComparison } from './MonthlyComparison';
import { ProgressFilters } from './ProgressFilters';
import { ProgressShareCard } from './ProgressShareCard';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface ProgressLayoutProps {
  userName?: string;
  className?: string;
}

export const ProgressLayout: React.FC<ProgressLayoutProps> = React.memo(({
  userName = 'Alex',
  className,
}) => {
  const [activeRange, setActiveRange] = useState('30d');

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <ProgressHero userName={userName} healthScore={92} strengthGainPct={14.5} />

      {/* 2. Range Filter Tabs */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Analytics Range</span>
        <ProgressFilters activeRange={activeRange} onChangeRange={setActiveRange} />
      </div>

      {/* 3. Health Score & Streak Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HealthScoreCard className="lg:col-span-2" />
        <StreakCard currentStreakDays={7} bestStreakDays={21} totalWorkouts={142} />
      </div>

      {/* 4. Strength Chart & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StrengthChart className="lg:col-span-2" />
        <AIInsightsCard />
      </div>

      {/* 5. Weekly Summary & Monthly Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeeklySummary className="lg:col-span-2" />
        <MonthlyComparison />
      </div>

      {/* 6. Body Composition & Metrics */}
      <BodyMetrics />
      <BodyCompositionCard />

      {/* 7. Consistency Heatmap */}
      <ConsistencyHeatmap totalActiveDays={142} />

      {/* 8. Personal Records & Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalRecords />
        <GoalProgress />
      </div>

      {/* 9. Timeline & Social Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AchievementsTimeline className="lg:col-span-2" />
        <ProgressShareCard userName={userName} />
      </div>
    </PageContainer>
  );
});

ProgressLayout.displayName = 'ProgressLayout';
