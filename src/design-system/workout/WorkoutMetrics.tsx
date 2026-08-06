import React from 'react';
import { Card } from '../components/Card';
import { Heart, Activity, Flame } from '../icons';

export interface WorkoutMetricsProps {
  heartRateBpm?: number;
  intensityZone?: string;
  caloriesBurned?: number;
  className?: string;
}

export const WorkoutMetrics: React.FC<WorkoutMetricsProps> = React.memo(({
  heartRateBpm = 142,
  intensityZone = 'Zone 4 • Anaerobic',
  caloriesBurned = 520,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 select-none ${className}`}>
      <Card variant="glass" className="p-4 flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
          <Heart className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Heart Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{heartRateBpm}</span>
            <span className="text-xs text-slate-400">BPM</span>
          </div>
          <span className="text-[10px] text-orange-400 font-semibold">{intensityZone}</span>
        </div>
      </Card>

      <Card variant="glass" className="p-4 flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <Flame className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Energy Expenditure</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{caloriesBurned}</span>
            <span className="text-xs text-slate-400">kcal</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Active Metabolism</span>
        </div>
      </Card>
    </div>
  );
});

WorkoutMetrics.displayName = 'WorkoutMetrics';
