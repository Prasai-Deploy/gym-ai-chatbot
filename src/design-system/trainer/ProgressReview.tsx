import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Play, Check } from '../icons';

export interface FormVideoReview {
  id: string;
  clientName: string;
  exercise: string;
  weightKg: number;
  date: string;
}

export interface ProgressReviewProps {
  reviews?: FormVideoReview[];
  onApproveReview?: (id: string) => void;
  className?: string;
}

export const ProgressReview: React.FC<ProgressReviewProps> = React.memo(({
  reviews = [
    { id: '1', clientName: 'Alexander Hayes', exercise: 'Conventional Deadlift 170kg Form Video', weightKg: 170, date: 'Today' },
    { id: '2', clientName: 'Sarah Jenkins', exercise: 'Barbell Back Squat 110kg Lockout Check', weightKg: 110, date: 'Yesterday' },
  ],
  onApproveReview,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Member Form Check Video Reviews</span>
        </div>
        <Badge variant="warning" size="sm">{reviews.length} Pending</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {reviews.map((rv) => (
          <div key={rv.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Play className="w-4 h-4 fill-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{rv.clientName}</span>
                <span className="text-[10px] text-slate-400">{rv.exercise} • {rv.date}</span>
              </div>
            </div>

            <Button
              variant="success"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5 stroke-[3]" />}
              onClick={() => onApproveReview?.(rv.id)}
            >
              Sign Off
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

ProgressReview.displayName = 'ProgressReview';
