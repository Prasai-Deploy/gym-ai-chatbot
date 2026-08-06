import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity, Heart, CheckCircle2 } from '../icons';

export interface RecoveryProtocol {
  title: string;
  duration: string;
  notes: string;
}

export interface RecoveryResponseCardProps {
  score: number;
  adviceText: string;
  protocols: RecoveryProtocol[];
  className?: string;
}

export const RecoveryResponseCard: React.FC<RecoveryResponseCardProps> = React.memo(({
  score,
  adviceText,
  protocols,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-5 flex flex-col gap-4 select-none my-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="ai" size="sm" icon={<Activity className="w-3.5 h-3.5" />}>
          CNS RECOVERY PROTOCOL
        </Badge>
        <span className="text-xs font-bold text-indigo-400">Score: {score}%</span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
        {adviceText}
      </p>

      <div className="flex flex-col gap-2">
        {protocols.map((p, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <div className="flex items-center justify-between font-bold text-white">
                <span>{p.title}</span>
                <span className="text-[10px] text-slate-400">{p.duration}</span>
              </div>
              <span className="text-[11px] text-slate-400">{p.notes}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

RecoveryResponseCard.displayName = 'RecoveryResponseCard';
