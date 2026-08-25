import React from 'react';
import { StatCard } from '../components/StatCard';
import { Flame, Zap, Award } from '../icons';

export interface DailyProgressProps {
  caloriesBurned?: number;
  activeMinutes?: number;
  workoutsLogged?: number;
  className?: string;
}

export const DailyProgress: React.FC<DailyProgressProps> = React.memo(({
  caloriesBurned = 1850,
  activeMinutes = 55,
  workoutsLogged = 1,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      <StatCard
        title="Calories Burned"
        value={caloriesBurned}
        unit="kcal"
        icon={<Flame className="w-5 h-5 text-brand-400" />}
        trend={{ value: '+12%', isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Active Time"
        value={activeMinutes}
        unit="mins"
        icon={<Zap className="w-5 h-5 text-amber-400" />}
        trend={{ value: '+5 mins', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Sessions Completed"
        value={workoutsLogged}
        unit="today"
        icon={<Award className="w-5 h-5 text-emerald-400" />}
        trend={{ value: 'On Track', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

DailyProgress.displayName = 'DailyProgress';
