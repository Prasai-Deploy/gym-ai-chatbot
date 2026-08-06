import React from 'react';
import { Badge } from '../components/Badge';
import { DollarSign, Sparkles, TrendingUp } from '../icons';
import { cn } from '../tokens';

export interface BillingHeroProps {
  mrr?: number;
  arr?: number;
  ltv?: number;
  forecast90Days?: number;
  className?: string;
}

export const BillingHero: React.FC<BillingHeroProps> = React.memo(({
  mrr = 48250,
  arr = 579000,
  ltv = 1840,
  forecast90Days = 158000,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />}>
            REVENUE OPERATING SYSTEM
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            TRINITY FINANCIAL ADVISOR
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Recurring Revenue & Billing 💳
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Monthly Recurring Revenue: <span className="text-amber-400 font-bold">${mrr.toLocaleString()}</span>. Annual Run Rate: <span className="text-emerald-400 font-bold">${arr.toLocaleString()}</span>. Projected 90-day expansion: <span className="text-indigo-400 font-bold">+${forecast90Days.toLocaleString()}</span>.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current MRR</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">${mrr.toLocaleString()}</span>
            <span className="text-xs text-amber-400 font-bold">/mo</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">+8.4% Net MRR Growth</span>
        </div>
      </div>
    </div>
  );
});

BillingHero.displayName = 'BillingHero';
