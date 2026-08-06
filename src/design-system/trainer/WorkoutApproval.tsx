import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Check, X } from '../icons';

export interface WorkoutApprovalProps {
  clientName?: string;
  suggestedChange?: string;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export const WorkoutApproval: React.FC<WorkoutApprovalProps> = React.memo(({
  clientName = 'Sarah Jenkins',
  suggestedChange = 'Swap Incline Barbell Press with Incline Dumbbell Flyes for 2 weeks to rest AC joint.',
  onApprove,
  onReject,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Routine Modification Approval</span>
        <Badge variant="warning" size="sm">Pending Sign-off</Badge>
      </div>

      <div className="flex flex-col gap-1 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 text-xs">
        <span className="font-bold text-white">{clientName}</span>
        <p className="text-slate-300 leading-relaxed">{suggestedChange}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="success"
          size="sm"
          leftIcon={<Check className="w-3.5 h-3.5 stroke-[3]" />}
          onClick={onApprove}
          className="flex-1"
        >
          Approve Change
        </Button>
        <Button variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onReject}>
          Decline
        </Button>
      </div>
    </Card>
  );
});

WorkoutApproval.displayName = 'WorkoutApproval';
