import React from 'react';
import { Chip } from '../components/Chip';
import { Flame, Sparkles, Activity, PieChart, TrendingUp } from '../icons';

export interface SuggestionChipsProps {
  onSelectSuggestion: (text: string) => void;
  className?: string;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(({
  onSelectSuggestion,
  className,
}) => {
  const suggestions = [
    { label: "Adjust today's chest & triceps workout", icon: <Flame className="w-3.5 h-3.5 text-orange-400" /> },
    { label: "Calculate my post-workout macro target", icon: <PieChart className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: "Audit my squat & deadlift form tips", icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> },
    { label: "Analyze my 30-day strength progress", icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: "Suggest active recovery mobility routine", icon: <Activity className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none ${className}`}>
      {suggestions.map((item, idx) => (
        <Chip
          key={idx}
          label={item.label}
          icon={item.icon}
          onSelect={() => onSelectSuggestion(item.label)}
          className="shrink-0"
        />
      ))}
    </div>
  );
});

SuggestionChips.displayName = 'SuggestionChips';
