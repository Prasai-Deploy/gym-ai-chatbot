import React, { useState } from 'react';
import { CreditCard, DollarSign, Users, ChevronDown, ChevronUp, Plus, ExternalLink } from '../icons';
import { cn } from '../tokens';

export interface SecondaryBusinessDetailsProps {
  arpuAmount?: number;
  grossAnnualArr?: number;
  onAddMember?: () => void;
  onViewBilling?: () => void;
  onExportReports?: () => void;
  className?: string;
}

export const SecondaryBusinessDetails: React.FC<SecondaryBusinessDetailsProps> = React.memo(({
  arpuAmount = 125,
  grossAnnualArr = 579000,
  onAddMember,
  onViewBilling,
  onExportReports,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col gap-4 select-none shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-[0.12em] font-sans">
            Financial Health & Executive Actions
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{isOpen ? 'Hide Details' : 'View Details'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 pt-2 border-t border-white/[0.06]">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">Average Revenue Per User (ARPU)</span>
              <span className="text-lg font-bold text-white font-display tabular-nums mt-0.5">
                ${arpuAmount} / month
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">Gross Annualized Run-Rate (ARR)</span>
              <span className="text-lg font-bold text-white font-display tabular-nums mt-0.5">
                ${grossAnnualArr.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick executive actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onAddMember && (
              <button
                type="button"
                onClick={onAddMember}
                className="px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}

            {onViewBilling && (
              <button
                type="button"
                onClick={onViewBilling}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.06] text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Billing Center</span>
              </button>
            )}

            {onExportReports && (
              <button
                type="button"
                onClick={onExportReports}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ml-auto"
              >
                <span>Export Financial Audit</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SecondaryBusinessDetails.displayName = 'SecondaryBusinessDetails';
