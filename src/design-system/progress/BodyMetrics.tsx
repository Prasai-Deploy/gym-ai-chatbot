import React from 'react';
import { StatCard } from '../components/StatCard';
import { Activity, Flame, TrendingUp, Heart } from '../icons';

export interface BodyMetricsProps {
  bodyWeightKg?: number;
  muscleMassPct?: number;
  bodyFatPct?: number;
  waistCm?: number;
  className?: string;
}

export const BodyMetrics: React.FC<BodyMetricsProps> = React.memo(({
  bodyWeightKg = 78.5,
  muscleMassPct = 44.2,
  bodyFatPct = 14.8,
  waistCm = 81,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 select-none ${className}`}>
      <StatCard
        title="Body Weight"
        value={bodyWeightKg}
        unit="kg"
        icon={<Activity className="w-5 h-5 text-orange-400" />}
        trend={{ value: '-1.2 kg', isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Muscle Mass"
        value={muscleMassPct}
        unit="%"
        icon={<Flame className="w-5 h-5 text-emerald-400" />}
        trend={{ value: '+1.5%', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Body Fat"
        value={bodyFatPct}
        unit="%"
        icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
        trend={{ value: '-1.8%', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Waist Measurement"
        value={waistCm}
        unit="cm"
        icon={<Heart className="w-5 h-5 text-cyan-400" />}
        trend={{ value: '-2 cm', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

BodyMetrics.displayName = 'BodyMetrics';
