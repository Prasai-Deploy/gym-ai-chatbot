import React from 'react';
import { CreditCard, Info } from 'lucide-react';
import { DeferredFinancialsNotice as NoticeType } from '../../../../api/analyticsApi';

interface Props {
  notice?: NoticeType;
}

export const DeferredFinancialsNotice: React.FC<Props> = ({ notice }) => {
  return (
    <div className="bg-[#0a0d14] p-5 rounded-2xl border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Organization Financial Analytics</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              Deferred to Phase 8H
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {notice?.note ||
              'Organization financial analytics deferred to Phase 8H. STRIVA B2C membership fees remain isolated and are not conflated with gym revenues.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-[#050608] px-3 py-2 rounded-xl border border-white/[0.05] shrink-0">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>B2B Billing Boundary Enforced</span>
      </div>
    </div>
  );
};
