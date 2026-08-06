import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface FeedbackItem {
  id: string;
  clientName: string;
  exercise: string;
  rpeScore: number;
  comment: string;
}

export interface ExerciseFeedbackProps {
  feedbacks?: FeedbackItem[];
  className?: string;
}

export const ExerciseFeedback: React.FC<ExerciseFeedbackProps> = React.memo(({
  feedbacks = [
    { id: '1', clientName: 'Samantha Reed', exercise: 'Romanian Deadlift 70kg', rpeScore: 9.5, comment: 'Hamstrings were burning on 4th set. Might need 90s rest next time.' },
    { id: '2', clientName: 'Alexander Hayes', exercise: 'Cable Tricep Pushdown', rpeScore: 7.0, comment: 'Felt easy. Ready for +5kg increase.' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Member RPE Difficulty Feedback</span>
        <Badge variant="neutral" size="sm">{feedbacks.length} Feedback Logs</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {feedbacks.map((fb) => (
          <div key={fb.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{fb.clientName}</span>
                <span className="text-[11px] text-slate-400">• {fb.exercise}</span>
              </div>
              <Badge variant={fb.rpeScore >= 9 ? 'danger' : 'primary'} size="sm">
                RPE {fb.rpeScore}
              </Badge>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed italic">"{fb.comment}"</p>
          </div>
        ))}
      </div>
    </Card>
  );
});

ExerciseFeedback.displayName = 'ExerciseFeedback';
