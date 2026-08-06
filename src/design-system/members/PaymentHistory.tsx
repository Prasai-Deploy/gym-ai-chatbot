import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface PaymentItem {
  id: string;
  desc: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending';
}

export interface PaymentHistoryProps {
  payments?: PaymentItem[];
  className?: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = React.memo(({
  payments = [
    { id: '1', desc: 'Gold Pro Plan Monthly Renewal', amount: 125, date: 'Jul 01, 2024', status: 'Paid' },
    { id: '2', desc: '10x Personal Training Sessions', amount: 800, date: 'Jun 10, 2024', status: 'Paid' },
    { id: '3', desc: 'Pro Shop Merchandise POS', amount: 45, date: 'Jun 02, 2024', status: 'Paid' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">POS Billing & Invoice History</span>
        <Badge variant="success" size="sm">Good Standing</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {payments.map((p) => (
          <div key={p.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-white">{p.desc}</span>
              <span className="text-[10px] text-slate-400">{p.date}</span>
            </div>
            <span className="font-extrabold text-emerald-400 font-mono">${p.amount}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

PaymentHistory.displayName = 'PaymentHistory';
