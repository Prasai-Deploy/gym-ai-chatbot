import React from 'react';
import { StatCard } from '../components/StatCard';
import { Heart, Activity, Zap } from '../icons';

export interface RecoveryMetricsProps {
  hrvMs?: number;
  sleepEfficiencyPct?: number;
  dayStrain?: number;
  className?: string;
}

export const RecoveryMetrics: React.FC<RecoveryMetricsProps> = React.memo(({
  hrvMs = 74,
  sleepEfficiencyPct = 92,
  dayStrain = 14.2,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 select-none ${className}`}>
      <StatCard
        title="Heart Rate Var. (HRV)"
        value={hrvMs}
        unit="ms"
        icon={<Heart className="w-5 h-5 text-red-400" />}
        variant="primary"
      />
      <StatCard
        title="Sleep Efficiency"
        value={sleepEfficiencyPct}
        unit="%"
        icon={<Activity className="w-5 h-5 text-indigo-400" />}
        variant="default"
      />
      <StatCard
        title="Day Strain Level"
        value={dayStrain}
        unit="/ 21"
        icon={<Zap className="w-5 h-5 text-amber-400" />}
        variant="default"
      />
    </div>
  );
});

RecoveryMetrics.displayName = 'RecoveryMetrics';
