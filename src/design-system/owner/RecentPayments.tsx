import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { CreditCard, DollarSign } from '../icons';

export interface TransactionItem {
  id: string;
  customerName: string;
  type: string;
  amount: number;
  time: string;
  status: 'Completed' | 'Pending';
}

export interface RecentPaymentsProps {
  transactions?: TransactionItem[];
  className?: string;
}

export const RecentPayments: React.FC<RecentPaymentsProps> = React.memo(({
  transactions = [
    { id: '1', customerName: 'Alexander Hayes', type: 'VIP Annual Renewal', amount: 1450, time: '10 mins ago', status: 'Completed' },
    { id: '2', customerName: 'Samantha Reed', type: '10x PT Session Package', amount: 800, time: '24 mins ago', status: 'Completed' },
    { id: '3', customerName: 'David Miller', type: 'Whey Isolate + Gear POS', amount: 95, time: '1 hour ago', status: 'Completed' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live POS & Billing Transactions</span>
        </div>
        <Badge variant="success" size="sm">Live Stream</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {transactions.map((tx) => (
          <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{tx.customerName}</span>
                <span className="text-[10px] text-slate-400">{tx.type} • {tx.time}</span>
              </div>
            </div>

            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              +${tx.amount}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});

RecentPayments.displayName = 'RecentPayments';
