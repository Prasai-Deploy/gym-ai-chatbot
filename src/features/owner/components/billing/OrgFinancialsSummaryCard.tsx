import React from 'react';
import { IndianRupee, FileText, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { OrgFinancialSummary } from '../../../../api/orgBillingApi';

interface Props {
  financials: OrgFinancialSummary | null;
  isLoading?: boolean;
}

export const OrgFinancialsSummaryCard: React.FC<Props> = ({ financials, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/[0.06] animate-pulse h-48" />
    );
  }

  const totalCollected = financials?.totalCollectedFormatted || '₹0.00';
  const paidCount = financials?.paidInvoicesCount ?? 0;
  const unpaidCount = financials?.unpaidInvoicesCount ?? 0;

  return (
    <div
      id="org-financials-card"
      className="p-6 rounded-3xl bg-gradient-to-br from-[#0c101a] to-[#07090e] border border-white/[0.08] shadow-xl relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Organization Financial Operations</h3>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Verified B2B billing telemetry and payment collections
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
            Tenant Scoped · INR
          </span>
        </div>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5">
        <div className="p-4 rounded-2xl bg-[#06080e] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cash Collections (B2B)
          </span>
          <span className="text-2xl font-black text-white mt-1.5 block tracking-tight">
            {totalCollected}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Lifetime realized receipts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#06080e] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Settled Invoices
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-black text-white tracking-tight">{paidCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Paid & verified receipts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#06080e] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Open / Due Invoices
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-2xl font-black text-white tracking-tight">{unpaidCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Pending collection
          </span>
        </div>
      </div>

      {/* Accounting & Boundary Disclaimer */}
      <div className="pt-3 border-t border-white/[0.04] flex items-start gap-2.5 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {financials?.accountingNote ||
            'Cash receipts collected from B2B gym software licenses. Does not constitute GAAP/accrual-recognized revenue. STRIVA B2C membership subscriptions are strictly isolated.'}
        </p>
      </div>
    </div>
  );
};
