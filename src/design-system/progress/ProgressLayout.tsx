import React from 'react';
import { ProgressHero } from './ProgressHero';
import { ProgressTrend } from './ProgressTrend';
import { ProgressHighlights } from './ProgressHighlights';
import { GoalProgress } from './GoalProgress';
import { ProgressTrinityCard } from './ProgressTrinityCard';
import { SecondaryProgressDetails } from './SecondaryProgressDetails';
import { useProgressData } from '../../hooks/useStrivaApi';
import { cn } from '../tokens';

export interface ProgressLayoutProps {
  userName?: string;
  onNavigateCoach?: () => void;
  className?: string;
}

export const ProgressLayout: React.FC<ProgressLayoutProps> = React.memo(({
  userName = 'Athlete',
  onNavigateCoach = () => console.log('Open Coach'),
  className,
}) => {
  const { data: progressData } = useProgressData();

  const strengthGain = progressData?.strengthGrowthPct || 14.5;
  const weightChange = progressData?.weightChangeKg || -1.8;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8', className)}>
      {/* 1. Header Identity */}
      <div className="flex flex-col gap-0.5 select-none">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          Performance & Analytics
        </h1>
      </div>

      {/* 2. Primary Progress Hero */}
      <ProgressHero
        overallProgressPct={12}
        strengthGainPct={Math.round(strengthGain)}
        consistencyGainPct={9}
        bodyChangePct={weightChange}
        headline="You're moving in the right direction."
      />

      {/* 3. Primary 12-Week Trend Line Chart */}
      <ProgressTrend />

      {/* 4. What's Improving Highlights */}
      <ProgressHighlights />

      {/* 5. Main Goal Milestone Progress */}
      <GoalProgress
        goalTitle="Hypertrophy & Strength Build"
        progressPct={72}
        totalWeeks={12}
        completedWeeks={8}
        projectionText="At your current pace, you're projected to reach your target in approximately 4 weeks."
      />

      {/* 6. Quiet Trinity AI Coach Consultation */}
      <ProgressTrinityCard
        insightText="Your strength is increasing consistently. Keep your current training frequency for the next 3 weeks."
        onAskTrinity={onNavigateCoach}
      />

      {/* 7. Secondary Details & Personal Records */}
      <SecondaryProgressDetails
        totalVolumeKg={12450}
        totalWorkouts={142}
      />
    </div>
  );
});

ProgressLayout.displayName = 'ProgressLayout';
