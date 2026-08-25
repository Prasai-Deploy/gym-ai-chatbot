import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { Play, Plus, Clock } from '../icons';
import { cn } from '../tokens';

export interface MinimalRestTimerProps {
  secondsRemaining: number;
  totalRestSeconds?: number;
  nextExerciseName: string;
  nextSetNumber: number;
  onSkipRest: () => void;
  onAddThirtySeconds: () => void;
  className?: string;
}

export const MinimalRestTimer: React.FC<MinimalRestTimerProps> = React.memo(({
  secondsRemaining,
  totalRestSeconds = 90,
  nextExerciseName,
  nextSetNumber,
  onSkipRest,
  onAddThirtySeconds,
  className,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress arc
  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(secondsRemaining / (totalRestSeconds || 1), 1));
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className={cn('w-full max-w-md mx-auto flex flex-col items-center text-center gap-6 select-none py-6', className)}>
      {/* Rest Arc Gauge */}
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F97316"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-0.5">
            REST
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold text-white font-display tabular-nums tracking-tight">
            {formatTime(secondsRemaining)}
          </span>
        </div>
      </div>

      {/* Next Up Target Context */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Next Up
        </span>
        <h3 className="text-base font-bold text-white tracking-tight">
          {nextExerciseName} • Set {nextSetNumber}
        </h3>
      </div>

      {/* Quick Rest Actions */}
      <div className="flex items-center gap-3 w-full sm:w-72">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAddThirtySeconds}
        >
          +30 sec
        </Button>

        <Button
          variant="primary"
          size="md"
          className="flex-1 font-bold"
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          onClick={onSkipRest}
        >
          Skip Rest
        </Button>
      </div>
    </div>
  );
});

MinimalRestTimer.displayName = 'MinimalRestTimer';
