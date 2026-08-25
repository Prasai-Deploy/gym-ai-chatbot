import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Flame, ArrowRight, Zap, Award } from '../icons';

export interface MissionCardProps {
  title?: string;
  category?: string;
  durationMin?: number;
  estimatedKcal?: number;
  onStartMission?: () => void;
  className?: string;
}

export const MissionCard: React.FC<MissionCardProps> = React.memo(({
  title = 'Hypertrophy Chest & Triceps Blast',
  category = 'Hypertrophy • Push Cycle',
  durationMin = 55,
  estimatedKcal = 520,
  onStartMission,
  className,
}) => {
  return (
    <Card variant="workout" className={`p-6 flex flex-col justify-between gap-5 relative overflow-hidden select-none ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
          TODAY'S MISSION
        </Badge>
        <span className="text-xs font-semibold text-brand-400">High Intensity</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{category}</span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-brand-400" />
          <span>{durationMin} Minutes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>~{estimatedKcal} kcal</span>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        rightIcon={<ArrowRight className="w-4 h-4" />}
        onClick={onStartMission}
        className="w-full"
      >
        Start Mission Workout
      </Button>
    </Card>
  );
});

MissionCard.displayName = 'MissionCard';
