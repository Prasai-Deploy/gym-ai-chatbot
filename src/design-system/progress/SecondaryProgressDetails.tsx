import React, { useState } from 'react';
import { Award, ChevronDown, ChevronUp, Dumbbell, Activity, Calendar } from '../icons';
import { cn } from '../tokens';

export interface SecondaryProgressDetailsProps {
  totalVolumeKg?: number;
  totalWorkouts?: number;
  personalRecords?: Array<{ exercise: string; weight: string; date: string }>;
  className?: string;
}

export const SecondaryProgressDetails: React.FC<SecondaryProgressDetailsProps> = React.memo(({
  totalVolumeKg = 12450,
  totalWorkouts = 142,
  personalRecords = [
    { exercise: 'Incline Bench Press', weight: '85.0 kg', date: 'Aug 18' },
    { exercise: 'Barbell Back Squat', weight: '120.0 kg', date: 'Aug 12' },
    { exercise: 'Conventional Deadlift', weight: '145.0 kg', date: 'Jul 29' },
  ],
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col gap-4 select-none shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em] font-sans">
            Personal Records & Lifetime Volume
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
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-slate-400" />
                Lifetime Volume
              </span>
              <span className="text-lg font-bold text-white font-display tabular-nums mt-0.5">
                {totalVolumeKg.toLocaleString()} kg
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Completed Sessions
              </span>
              <span className="text-lg font-bold text-white font-display tabular-nums mt-0.5">
                {totalWorkouts} workouts
              </span>
            </div>
          </div>

          {/* PR list */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Recent Personal Records
            </span>
            <div className="flex flex-col gap-1.5">
              {personalRecords.map((pr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs"
                >
                  <span className="font-semibold text-white">{pr.exercise}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-orange-400 font-display tabular-nums">{pr.weight}</span>
                    <span className="text-[11px] text-slate-500">{pr.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SecondaryProgressDetails.displayName = 'SecondaryProgressDetails';
