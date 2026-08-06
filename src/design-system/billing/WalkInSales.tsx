import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface WalkInRecord {
  id: string;
  item: string;
  amount: number;
  time: string;
}

export interface WalkInSalesProps {
  sales?: WalkInRecord[];
  className?: string;
}

export const WalkInSales: React.FC<WalkInSalesProps> = React.memo(({
  sales = [
    { id: '1', item: '2x Day Passes ($50.00)', amount: 50, time: '10 mins ago' },
    { id: '2', item: 'Protein Shake + Towel ($21.00)', amount: 21, time: '42 mins ago' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Walk-In & POS Sales Stream</span>
        <Badge variant="neutral" size="sm">Front Desk POS</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {sales.map((s) => (
          <div key={s.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-white">{s.item}</span>
              <span className="text-[10px] text-slate-400">{s.time}</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">${s.amount}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

WalkInSales.displayName = 'WalkInSales';
