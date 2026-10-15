import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  pricingConfigured: boolean;
  taxConfigured: boolean;
}

export const SetupRequiredNotice: React.FC<Props> = ({ pricingConfigured, taxConfigured }) => {
  if (pricingConfigured && taxConfigured) {
    return (
      <div
        id="billing-status-configured"
        className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
          <div>
            <span className="text-xs font-bold block text-white">B2B Financial Operations Active</span>
            <span className="text-[11px] text-emerald-300/80 block">
              Gym software subscription plans and invoicing rules are configured and server-verified.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
          Ready
        </span>
      </div>
    );
  }

  return (
    <div
      id="billing-setup-required-notice"
      className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0e111a] to-orange-500/10 border border-amber-500/20 text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">B2B Production Setup Required</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Pricing Decision Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            Gym software B2B subscription pricing, Razorpay B2B plan IDs, and GST/Tax registrations are deliberately unconfigured pending executive owner approval. Production checkouts fail closed to prevent unauthorized charges.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${pricingConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span>B2B Pricing: {pricingConfigured ? 'Approved' : 'Awaiting Approval'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${taxConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span>GST/Tax Rules: {taxConfigured ? 'Configured' : 'Unconfigured (Receipt Mode)'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        <span className="text-[11px] font-semibold text-slate-400 bg-[#07090e] px-3 py-1.5 rounded-xl border border-white/[0.06]">
          Phase 8H Guard Active
        </span>
      </div>
    </div>
  );
};
