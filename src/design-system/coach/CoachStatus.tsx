import React from 'react';
import { Badge } from '../components/Badge';
import { Bot, Sparkles, Activity, Shield } from '../icons';

export interface CoachStatusProps {
  modelName?: string;
  contextWindow?: string;
  readinessScore?: number;
  className?: string;
}

export const CoachStatus: React.FC<CoachStatusProps> = React.memo(({
  modelName = 'Arcee Trinity Large 400B MoE',
  contextWindow = '128k Tokens',
  readinessScore = 88,
  className,
}) => {
  return (
    <div className={`p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-bold text-white flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-indigo-400" />
          {modelName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          {contextWindow}
        </Badge>
        <Badge variant="success" size="sm" icon={<Activity className="w-3 h-3" />}>
          Readiness: {readinessScore}%
        </Badge>
      </div>
    </div>
  );
});

CoachStatus.displayName = 'CoachStatus';
