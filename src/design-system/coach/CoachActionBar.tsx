import React from 'react';
import { Button } from '../components/Button';
import { Flame, PieChart, Activity, TrendingUp } from '../icons';

export interface CoachActionBarProps {
  onTriggerTool: (toolName: string) => void;
  className?: string;
}

export const CoachActionBar: React.FC<CoachActionBarProps> = React.memo(({
  onTriggerTool,
  className,
}) => {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none ${className}`}>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
        onClick={() => onTriggerTool('Generate Workout')}
        className="shrink-0"
      >
        Generate Workout
      </Button>

      <Button
        variant="outline"
        size="sm"
        leftIcon={<PieChart className="w-3.5 h-3.5 text-emerald-400" />}
        onClick={() => onTriggerTool('Modify Macros')}
        className="shrink-0"
      >
        Modify Diet Macros
      </Button>

      <Button
        variant="outline"
        size="sm"
        leftIcon={<Activity className="w-3.5 h-3.5 text-indigo-400" />}
        onClick={() => onTriggerTool('Log Recovery')}
        className="shrink-0"
      >
        Audit Recovery & HRV
      </Button>

      <Button
        variant="outline"
        size="sm"
        leftIcon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
        onClick={() => onTriggerTool('Strength Insights')}
        className="shrink-0"
      >
        30-Day Strength Audit
      </Button>
    </div>
  );
});

CoachActionBar.displayName = 'CoachActionBar';
