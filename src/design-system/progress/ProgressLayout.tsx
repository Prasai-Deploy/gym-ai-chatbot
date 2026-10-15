import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressHero } from './ProgressHero';
import { ProgressTrend } from './ProgressTrend';
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
  const navigate = useNavigate();
  const { data: progressData, isLoading, isError } = useProgressData();

  const workoutCount = progressData?.workout_count || 0;
  const lifetimeVolume = progressData?.lifetime_volume_kg || 0;
  const currentStreak = progressData?.current_streak || 0;
  const longestStreak = progressData?.longest_streak || 0;
  const trainingHours = progressData?.total_training_time_seconds
    ? Math.round((progressData.total_training_time_seconds / 3600) * 10) / 10
    : 0;

  const hasHistory = workoutCount > 0;

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

      {/* 2. Primary Progress Hero with Real Statistics */}
      <ProgressHero
        workoutCount={workoutCount}
        totalVolumeKg={lifetimeVolume}
        currentStreakDays={currentStreak}
        trainingTimeHours={trainingHours}
        hasHistory={hasHistory}
        headline={hasHistory ? "Consistent effort builds elite conditioning." : "No training history recorded yet."}
        onStartWorkout={() => navigate('/v3/workout')}
      />

      {/* 3. Longitudinal Volume & Overload Trend Chart */}
      <ProgressTrend
        hasHistory={hasHistory}
        trendPoints={hasHistory ? [lifetimeVolume] : []}
      />

      {/* 4. TRINETRA AI Progress Coach Consultation */}
      <ProgressTrinityCard
        insightText={
          hasHistory
            ? `You have logged ${workoutCount} workouts with ${lifetimeVolume.toLocaleString()} kg total volume. Maintain your training cadence to build compound endurance.`
            : "TRINETRA AI is calibrated and ready. Record your first workout session to receive personalized volume and recovery intelligence."
        }
        onAskTrinity={onNavigateCoach}
      />

      {/* 5. Secondary Details & Benchmark Milestones */}
      <SecondaryProgressDetails
        totalVolumeKg={lifetimeVolume}
        totalWorkouts={workoutCount}
        longestStreak={longestStreak}
        lastWorkoutDate={progressData?.last_workout_date}
        personalRecords={[]}
      />
    </div>
  );
});

ProgressLayout.displayName = 'ProgressLayout';
