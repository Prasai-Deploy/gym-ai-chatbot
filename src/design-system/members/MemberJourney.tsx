import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Progress } from '../components/Progress';

export interface MemberJourneyProps {
  tenureDays?: number;
  onboardingPct?: number;
  retentionRating?: string;
  className?: string;
}

export const MemberJourney: React.FC<MemberJourneyProps> = React.memo(({
  tenureDays = 142,
  onboardingPct = 100,
  retentionRating = 'Loyal Enthusiast',
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Lifecycle Journey</span>
        <Badge variant="success" size="sm">{retentionRating}</Badge>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Onboarding Completion</span>
          <span className="font-bold text-emerald-400">{onboardingPct}% Complete</span>
        </div>
        <Progress value={onboardingPct} max={100} variant="success" size="sm" />
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400">Total Tenure:</span>
        <span className="font-extrabold text-white">{tenureDays} Days Member</span>
      </div>
    </Card>
  );
});

MemberJourney.displayName = 'MemberJourney';
