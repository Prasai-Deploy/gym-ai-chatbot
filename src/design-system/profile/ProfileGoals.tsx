import React, { useState } from 'react';
import { Target, Edit3, Check } from '../icons';
import { cn } from '../tokens';

export interface ProfileGoalsProps {
  primaryGoal?: string;
  primaryFrequency?: string;
  secondaryGoal?: string;
  onSaveGoals?: (primary: string, secondary: string) => void;
  className?: string;
}

export const ProfileGoals: React.FC<ProfileGoalsProps> = React.memo(({
  primaryGoal = 'Build Strength & Hypertrophy',
  primaryFrequency = '4 training sessions / week',
  secondaryGoal = 'Improve Body Composition & Recovery',
  onSaveGoals,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [primary, setPrimary] = useState(primaryGoal);
  const [secondary, setSecondary] = useState(secondaryGoal);

  const handleSave = () => {
    setIsEditing(false);
    onSaveGoals?.(primary, secondary);
  };

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-orange-400" />
          YOUR GOALS
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
              <span>Edit Goals</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Primary Goal</label>
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400">Secondary Goal</label>
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#181C28] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Primary Goal */}
          <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-400">Primary Focus</span>
            <span className="text-sm font-bold text-white tracking-tight">
              {primary} • <span className="text-xs font-normal text-slate-400">{primaryFrequency}</span>
            </span>
          </div>

          {/* Secondary Goal */}
          <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-400">Secondary Focus</span>
            <span className="text-sm font-bold text-white tracking-tight">{secondary}</span>
          </div>
        </div>
      )}
    </div>
  );
});

ProfileGoals.displayName = 'ProfileGoals';
