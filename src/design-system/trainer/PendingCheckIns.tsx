import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Check, ChevronRight } from '../icons';

export interface CheckInItem {
  id: string;
  clientName: string;
  weightChangeKg: number;
  energyLevel: string;
  submittedDate: string;
}

export interface PendingCheckInsProps {
  checkIns?: CheckInItem[];
  onReviewCheckIn?: (id: string) => void;
  className?: string;
}

export const PendingCheckIns: React.FC<PendingCheckInsProps> = React.memo(({
  checkIns = [
    { id: '1', clientName: 'Marcus Vance', weightChangeKg: -0.8, energyLevel: 'High (8/10)', submittedDate: 'Today 08:30 AM' },
    { id: '2', clientName: 'Lucas Torrez', weightChangeKg: +0.4, energyLevel: 'Moderate (6/10)', submittedDate: 'Yesterday' },
    { id: '3', clientName: 'Samantha Reed', weightChangeKg: -1.2, energyLevel: 'High (9/10)', submittedDate: 'Yesterday' },
  ],
  onReviewCheckIn,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Weekly Member Check-in Questionnaire Submissions</span>
        <Badge variant="warning" size="sm">{checkIns.length} Pending</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {checkIns.map((ci) => (
          <div key={ci.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">{ci.clientName}</span>
              <span className="text-[10px] text-slate-400">
                Weight: <span className="text-emerald-400 font-bold">{ci.weightChangeKg} kg</span> • Energy: {ci.energyLevel}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => onReviewCheckIn?.(ci.id)}
            >
              Review
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

PendingCheckIns.displayName = 'PendingCheckIns';
