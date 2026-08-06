import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { AlertTriangle, ChevronRight, MessageSquare } from '../icons';

export interface AttentionItem {
  id: string;
  clientName: string;
  reason: string;
  urgency: 'High' | 'Medium';
}

export interface AttentionRequiredProps {
  items?: AttentionItem[];
  onReviewClient?: (id: string) => void;
  className?: string;
}

export const AttentionRequired: React.FC<AttentionRequiredProps> = React.memo(({
  items = [
    { id: '1', clientName: 'Sarah Jenkins', reason: 'Missed 2 consecutive workouts (Chest & Back)', urgency: 'High' },
    { id: '2', clientName: 'Samantha Reed', reason: 'Flagged high shoulder fatigue (RPE 9.5)', urgency: 'High' },
    { id: '3', clientName: 'Lucas Torrez', reason: 'Submitted weekly check-in with diet questions', urgency: 'Medium' },
  ],
  onReviewClient,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Attention Required Priority Queue</span>
        </div>
        <Badge variant="warning" size="sm">{items.length} Action Needed</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((it) => (
          <div key={it.id} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{it.clientName}</span>
                <Badge variant={it.urgency === 'High' ? 'danger' : 'warning'} size="sm">
                  {it.urgency} Urgency
                </Badge>
              </div>
              <p className="text-[11px] text-amber-200">{it.reason}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MessageSquare className="w-3.5 h-3.5 text-amber-400" />}
              onClick={() => onReviewClient?.(it.id)}
            >
              Message
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

AttentionRequired.displayName = 'AttentionRequired';
