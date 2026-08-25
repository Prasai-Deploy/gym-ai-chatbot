import React, { useState } from 'react';
import { Dumbbell, Edit3, Check } from '../icons';
import { cn } from '../tokens';

export interface FitnessProfileSectionProps {
  initialHeightCm?: number;
  initialWeightKg?: number;
  initialAge?: number;
  initialExperience?: string;
  initialFrequency?: string;
  onSaveProfile?: (data: { height: number; weight: number; age: number; experience: string; frequency: string }) => void;
  className?: string;
}

export const FitnessProfileSection: React.FC<FitnessProfileSectionProps> = React.memo(({
  initialHeightCm = 178,
  initialWeightKg = 78,
  initialAge = 24,
  initialExperience = 'Intermediate',
  initialFrequency = '4 sessions / week',
  onSaveProfile,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [height, setHeight] = useState(initialHeightCm);
  const [weight, setWeight] = useState(initialWeightKg);
  const [age, setAge] = useState(initialAge);
  const [experience, setExperience] = useState(initialExperience);
  const [frequency, setFrequency] = useState(initialFrequency);

  const handleSave = () => {
    setIsEditing(false);
    onSaveProfile?.({ height, weight, age, experience, frequency });
  };

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-orange-400" />
          FITNESS PROFILE
        </span>

        <button
          type="button"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Experience</label>
            <input
              type="text"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Frequency</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between py-2.5 min-h-[44px]">
            <span className="text-xs text-slate-400">Height</span>
            <span className="text-sm font-bold text-white font-display tabular-nums">{height} cm</span>
          </div>
          <div className="flex items-center justify-between py-2.5 min-h-[44px]">
            <span className="text-xs text-slate-400">Weight</span>
            <span className="text-sm font-bold text-white font-display tabular-nums">{weight} kg</span>
          </div>
          <div className="flex items-center justify-between py-2.5 min-h-[44px]">
            <span className="text-xs text-slate-400">Experience Level</span>
            <span className="text-sm font-bold text-white">{experience}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 min-h-[44px]">
            <span className="text-xs text-slate-400">Training Frequency</span>
            <span className="text-sm font-bold text-white">{frequency}</span>
          </div>
        </div>
      )}
    </div>
  );
});

FitnessProfileSection.displayName = 'FitnessProfileSection';
