import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { StatCard } from '../components/StatCard';
import { Award, Flame, Dumbbell, Zap, ArrowRight } from '../icons';

export interface WorkoutSummaryProps {
  routineTitle?: string;
  totalVolumeKg?: number;
  caloriesBurned?: number;
  durationMin?: number;
  prsHit?: number;
  xpEarned?: number;
  onDone?: () => void;
  className?: string;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = React.memo(({
  routineTitle = 'Hypertrophy Chest & Triceps Blast',
  totalVolumeKg = 12450,
  caloriesBurned = 520,
  durationMin = 48,
  prsHit = 2,
  xpEarned = 450,
  onDone,
  className,
}) => {
  return (
    <Card variant="workout" className={`p-6 sm:p-8 flex flex-col gap-6 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Badge variant="primary" size="sm" icon={<Award className="w-3.5 h-3.5" />}>
            WORKOUT SUMMARY REPORT
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">{routineTitle}</h1>
        </div>
        <Badge variant="success" size="sm">+{xpEarned} XP Earned</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Volume"
          value={totalVolumeKg.toLocaleString()}
          unit="kg"
          icon={<Dumbbell className="w-5 h-5 text-orange-400" />}
          variant="primary"
        />
        <StatCard
          title="Calories Burned"
          value={caloriesBurned}
          unit="kcal"
          icon={<Flame className="w-5 h-5 text-amber-400" />}
          variant="default"
        />
        <StatCard
          title="Active Duration"
          value={durationMin}
          unit="mins"
          icon={<Zap className="w-5 h-5 text-emerald-400" />}
          variant="default"
        />
      </div>

      {prsHit > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Personal Record (PR) Unlocked!</span>
              <span className="text-[11px] text-amber-200">You achieved {prsHit} new PRs during this workout session.</span>
            </div>
          </div>
          <Badge variant="warning" size="sm">{prsHit} PRs</Badge>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        rightIcon={<ArrowRight className="w-4 h-4" />}
        onClick={onDone}
        className="w-full mt-2"
      >
        Return to Dashboard
      </Button>
    </Card>
  );
});

WorkoutSummary.displayName = 'WorkoutSummary';
