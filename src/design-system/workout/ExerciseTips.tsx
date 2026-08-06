import React from 'react';
import { Bot, Sparkles } from '../icons';

export interface ExerciseTipsProps {
  tips?: string[];
  coachNote?: string;
  className?: string;
}

export const ExerciseTips: React.FC<ExerciseTipsProps> = React.memo(({
  tips = [
    'Maintain a 30-degree incline bench angle to bias upper pectoralis fibers.',
    'Keep your shoulder blades retracted and depressed throughout the press.',
    'Exhale explosively on the concentric upward press.',
  ],
  coachNote = "Trinity AI Suggestion: Increase working weight +2.5kg if set 1 feels below RPE 8.",
  className,
}) => {
  return (
    <div className={`p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col gap-2 text-xs select-none ${className}`}>
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-indigo-400" />
        <span className="font-bold text-white uppercase tracking-wider">Trinity AI Form Cues</span>
      </div>

      <ul className="flex flex-col gap-1 text-slate-300 list-disc list-inside">
        {tips.map((tip, idx) => (
          <li key={idx} className="leading-relaxed">{tip}</li>
        ))}
      </ul>

      {coachNote && (
        <div className="mt-1 p-2 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-indigo-300 font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          <span>{coachNote}</span>
        </div>
      )}
    </div>
  );
});

ExerciseTips.displayName = 'ExerciseTips';
