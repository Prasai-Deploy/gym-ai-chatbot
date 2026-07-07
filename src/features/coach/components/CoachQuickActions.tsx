import React from 'react';

const ACTIONS = [
  "Start Workout",
  "Log Meal",
  "Log Water",
  "Check Progress",
  "View Recovery",
  "Generate Meal Plan"
];

export const CoachQuickActions: React.FC<{ onActionSelect: (action: string) => void }> = ({ onActionSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar w-full">
      {ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => onActionSelect(action)}
          className="whitespace-nowrap px-3 py-1.5 bg-white border-[0.5px] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75] text-[11px] font-bold text-gray-600 rounded-full shadow-sm transition-colors"
        >
          {action}
        </button>
      ))}
    </div>
  );
};
