import React from 'react';
import { StatCard } from '../components/StatCard';
import { Flame, Zap, Dumbbell } from '../icons';

export interface WorkoutStatsProps {
  totalVolumeKg?: number;
  caloriesBurned?: number;
  setsLogged?: number;
  className?: string;
}

export const WorkoutStats: React.FC<WorkoutStatsProps> = React.memo(({
  totalVolumeKg = 12450,
  caloriesBurned = 520,
  setsLogged = 12,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 select-none ${className}`}>
      <StatCard
        title="Volume Lifted"
        value={totalVolumeKg.toLocaleString()}
        unit="kg"
        icon={<Dumbbell className="w-5 h-5 text-orange-400" />}
        variant="primary"
      />
      <StatCard
        title="Est. Calories"
        value={caloriesBurned}
        unit="kcal"
        icon={<Flame className="w-5 h-5 text-amber-400" />}
        variant="default"
      />
      <StatCard
        title="Sets Completed"
        value={setsLogged}
        unit="sets"
        icon={<Zap className="w-5 h-5 text-emerald-400" />}
        variant="default"
      />
    </div>
  );
});

WorkoutStats.displayName = 'WorkoutStats';
