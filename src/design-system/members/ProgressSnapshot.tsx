import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface ProgressSnapshotProps {
  weightChangeKg?: number;
  strengthGrowthPct?: number;
  bodyFatChangePct?: number;
  className?: string;
}

export const ProgressSnapshot: React.FC<ProgressSnapshotProps> = React.memo(({
  weightChangeKg = -1.8,
  strengthGrowthPct = 14.5,
  bodyFatChangePct = -2.1,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Transformation Snapshot (30D)</span>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400">Weight</span>
          <span className="font-extrabold text-emerald-400">{weightChangeKg} kg</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400">Strength</span>
          <span className="font-extrabold text-orange-400">+{strengthGrowthPct}%</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400">Body Fat</span>
          <span className="font-extrabold text-indigo-400">{bodyFatChangePct}%</span>
        </div>
      </div>
    </Card>
  );
});

ProgressSnapshot.displayName = 'ProgressSnapshot';
