import React from 'react';
import { StatCard } from '../components/StatCard';
import { Flame, Dumbbell, Zap } from '../icons';

export interface WeeklySummaryProps {
  volumeThisWeekKg?: number;
  volumeLastWeekKg?: number;
  workoutsThisWeek?: number;
  caloriesBurnedThisWeek?: number;
  className?: string;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = React.memo(({
  volumeThisWeekKg = 48500,
  volumeLastWeekKg = 42100,
  workoutsThisWeek = 5,
  caloriesBurnedThisWeek = 2850,
  className,
}) => {
  const diffVolume = volumeThisWeekKg - volumeLastWeekKg;
  const pctDiff = Math.round((diffVolume / volumeLastWeekKg) * 100);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 select-none ${className}`}>
      <StatCard
        title="Weekly Volume"
        value={volumeThisWeekKg.toLocaleString()}
        unit="kg"
        icon={<Dumbbell className="w-5 h-5 text-orange-400" />}
        trend={{ value: `+${pctDiff}% vs last week`, isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Sessions Completed"
        value={workoutsThisWeek}
        unit="this week"
        icon={<Zap className="w-5 h-5 text-emerald-400" />}
        trend={{ value: 'Target Met', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Weekly Energy"
        value={caloriesBurnedThisWeek.toLocaleString()}
        unit="kcal"
        icon={<Flame className="w-5 h-5 text-amber-400" />}
        trend={{ value: '+350 kcal', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

WeeklySummary.displayName = 'WeeklySummary';
