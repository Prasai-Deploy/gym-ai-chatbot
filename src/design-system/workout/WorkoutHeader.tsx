import React from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Flame, RefreshCw, X, Play } from '../icons';

export interface WorkoutHeaderProps {
  title?: string;
  category?: string;
  elapsedSeconds?: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onEndWorkout?: () => void;
  className?: string;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = React.memo(({
  title = 'Hypertrophy Chest & Triceps Blast',
  category = 'Hypertrophy • Push Cycle',
  elapsedSeconds = 1420,
  isPaused = false,
  onTogglePause,
  onEndWorkout,
  className,
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${className}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
            LIVE WORKOUT
          </Badge>
          <span className="text-xs font-semibold text-slate-400">{category}</span>
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 border border-white/10 font-mono text-sm font-bold text-brand-400">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          {formatTime(elapsedSeconds)}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onTogglePause}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="danger" size="sm" onClick={onEndWorkout}>
            Finish Workout
          </Button>
        </div>
      </div>
    </div>
  );
});

WorkoutHeader.displayName = 'WorkoutHeader';
