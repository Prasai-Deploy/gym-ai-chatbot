import { motion } from 'motion/react';
import { Flame } from 'lucide-react';

interface CaloriesRingProps {
  burned: number;
  goal: number;
}

export function CaloriesRing({ burned, goal }: CaloriesRingProps) {
  const effectiveGoal = goal && goal > 0 ? goal : 2000;
  const progress = Math.min(burned / effectiveGoal, 1);
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="card p-6 md:p-8"
    >
      <div className="flex flex-col items-center">
        {/* Ring */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="cal-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-calories)" />
                <stop offset="100%" stopColor="var(--color-calories)" />
              </linearGradient>
            </defs>

            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              className="calories-ring-track"
              strokeWidth={strokeWidth}
            />

            {/* Progress arc */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#cal-ring-grad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="calories-ring-fill"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-[var(--surface-elevated)]"
            >
              <Flame size={20} style={{ color: 'var(--color-calories)' }} />
            </div>
            <span
              className="text-3xl sm:text-4xl font-extrabold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {burned}
            </span>
            <span
              className="text-xs font-bold uppercase tracking-widest mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              kcal burned
            </span>
          </div>
        </div>

        {/* Goal label */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-center">
            <span
              style={{ color: 'var(--color-calories)' }}
            >
              {pct}%
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              of goal
            </p>
          </div>
          <div
            className="w-px h-8 bg-[var(--border-subtle)]"
          />
          <div className="text-center">
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {effectiveGoal}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              goal kcal
            </p>
          </div>
          <div
            className="w-px h-8 bg-[var(--border-subtle)]"
          />
          <div className="text-center">
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: burned >= effectiveGoal ? '#10b981' : 'var(--text-secondary)' }}
            >
              {Math.max(effectiveGoal - burned, 0)}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              remaining
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
