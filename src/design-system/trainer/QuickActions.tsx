import React from 'react';
import { Button } from '../components/Button';
import { Plus, Dumbbell, MessageSquare, Calendar } from '../icons';

export interface QuickActionsProps {
  onAssignWorkout?: () => void;
  onAssignDiet?: () => void;
  onLogPTSession?: () => void;
  onBroadcastMessage?: () => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  onAssignWorkout,
  onAssignDiet,
  onLogPTSession,
  onBroadcastMessage,
  className,
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 select-none ${className}`}>
      <Button
        variant="primary"
        size="md"
        leftIcon={<Dumbbell className="w-4 h-4" />}
        onClick={onAssignWorkout}
      >
        Assign Workout Plan
      </Button>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus className="w-4 h-4 text-emerald-400" />}
        onClick={onAssignDiet}
      >
        Assign Diet Plan
      </Button>

      <Button
        variant="outline"
        size="md"
        leftIcon={<Calendar className="w-4 h-4 text-indigo-400" />}
        onClick={onLogPTSession}
      >
        Log 1-on-1 PT Session
      </Button>

      <Button
        variant="ghost"
        size="md"
        leftIcon={<MessageSquare className="w-4 h-4 text-slate-400" />}
        onClick={onBroadcastMessage}
      >
        Send Client Announcement
      </Button>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
