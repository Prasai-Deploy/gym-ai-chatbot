import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Award, Zap } from '../icons';

export interface TopTrainerItem {
  id: string;
  name: string;
  revenueGenerated: number;
  clientRating: number;
  ptSessions: number;
}

export interface TopTrainersProps {
  trainers?: TopTrainerItem[];
  className?: string;
}

export const TopTrainers: React.FC<TopTrainersProps> = React.memo(({
  trainers = [
    { id: '1', name: 'Elena Rostova', revenueGenerated: 12400, clientRating: 4.9, ptSessions: 48 },
    { id: '2', name: 'Brandon Vance', revenueGenerated: 9800, clientRating: 4.8, ptSessions: 38 },
    { id: '3', name: 'Maya Lin', revenueGenerated: 8500, clientRating: 5.0, ptSessions: 34 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Top Revenue Trainers Leaderboard</span>
        </div>
        <Badge variant="warning" size="sm">July Performance</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {trainers.map((tr, idx) => (
          <div key={tr.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                #{idx + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{tr.name}</span>
                <span className="text-[10px] text-slate-400">Rating: ⭐ {tr.clientRating} • {tr.ptSessions} PT sessions</span>
              </div>
            </div>

            <span className="text-sm font-extrabold text-amber-400 font-mono">
              ${tr.revenueGenerated.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});

TopTrainers.displayName = 'TopTrainers';
