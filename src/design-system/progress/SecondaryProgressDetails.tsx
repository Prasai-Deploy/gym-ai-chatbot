import React, { useState } from 'react';
import { Award, ChevronDown, ChevronUp, Dumbbell, Activity, Calendar } from '../icons';
import { cn } from '../tokens';

export interface SecondaryProgressDetailsProps {
  totalVolumeKg?: number;
  totalWorkouts?: number;
  longestStreak?: number;
  lastWorkoutDate?: string | null;
  personalRecords?: Array<{ exercise: string; weight: string; date: string }>;
  className?: string;
}

export const SecondaryProgressDetails: React.FC<SecondaryProgressDetailsProps> = React.memo(({
  totalVolumeKg = 0,
  totalWorkouts = 0,
  longestStreak = 0,
  lastWorkoutDate = null,
  personalRecords = [],
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasRecords = personalRecords.length > 0;

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col gap-4 select-none shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-lime-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em] font-sans">
            Personal Records & Benchmark Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{isOpen ? 'Hide Details' : 'View Details'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 pt-2 border-t border-white/[0.06]">
          {/* Lifetime stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-slate-400" />
                Lifetime Volume
              </span>
              <span className="text-base sm:text-lg font-bold text-white font-display tabular-nums mt-0.5">
                {totalWorkouts > 0 ? `${totalVolumeKg.toLocaleString()} kg` : '--'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Completed Sessions
              </span>
              <span className="text-base sm:text-lg font-bold text-white font-display tabular-nums mt-0.5">
                {totalWorkouts}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" />
                Best Streak
              </span>
              <span className="text-base sm:text-lg font-bold text-white font-display tabular-nums mt-0.5">
                {totalWorkouts > 0 ? `${longestStreak} days` : '--'}
              </span>
            </div>
          </div>

          {/* Personal Records Sub-list */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PR Milestones
            </span>
            {!hasRecords ? (
              <p className="text-xs text-slate-500 py-2">
                No personal records logged yet. Establish maximum load lifts during logged workouts.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {personalRecords.map((pr, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-300 font-medium">{pr.exercise}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lime-400 font-bold font-display">{pr.weight}</span>
                      <span className="text-[10px] text-slate-500">{pr.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SecondaryProgressDetails.displayName = 'SecondaryProgressDetails';
