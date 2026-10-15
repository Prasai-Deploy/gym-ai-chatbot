import React from 'react';
import { Target, HelpCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { RetentionAnalyticsData } from '../../../../api/analyticsApi';

interface Props {
  data?: RetentionAnalyticsData;
}

export const RetentionAnalyticsCard: React.FC<Props> = ({ data }) => {
  if (!data || !data.hasData) {
    return (
      <div className="bg-[#0a0d14] p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between">
        <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Attendance Retention</h2>
            <p className="text-xs text-slate-400">30-day returning member behavior</p>
          </div>
        </div>
        <div className="py-10 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-400">Not enough historical data.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Calculating cohort retention requires attendance logs spanning at least two consecutive periods.
          </p>
        </div>
      </div>
    );
  }

  const {
    retentionRate,
    returningMembers,
    previousUniqueMembers,
    status,
    definition,
    message,
    activeMemberRatio,
  } = data;

  const hasCalculatedRate = status === 'calculated' && retentionRate !== null;

  return (
    <section
      aria-labelledby="retention-analytics-heading"
      className="bg-[#0a0d14] p-5 sm:p-6 rounded-2xl border border-white/[0.06] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 id="retention-analytics-heading" className="text-base font-bold text-white tracking-tight">
              Member Retention & Return Rate
            </h2>
            <p className="text-xs text-slate-400">Deterministic repeat visit calculations</p>
          </div>
        </div>

        {hasCalculatedRate ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deterministic metric</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Insufficient history</span>
          </div>
        )}
      </div>

      {/* KPI Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Metric 1: 30-Day Attendance Retention Rate */}
        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Returning Attendee Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            {hasCalculatedRate ? (
              <>
                <span className="text-3xl font-bold text-indigo-400 font-mono">
                  {retentionRate}%
                </span>
                <span className="text-xs text-slate-400">
                  ({returningMembers} / {previousUniqueMembers} returned)
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-amber-400">
                Not enough historical data
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{message}</p>
        </div>

        {/* Metric 2: Active Member Ratio */}
        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Roster Ratio
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-emerald-400 font-mono">
              {activeMemberRatio}%
            </span>
            <span className="text-xs text-slate-400">of total registered members</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Proportion of registered member records with active membership status.
          </p>
        </div>
      </div>

      {/* Definition Explainer Banner */}
      <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Mathematical Definition:</p>
          <p className="text-slate-400 leading-relaxed">{definition}</p>
          <p className="text-[11px] text-slate-500 pt-1">
            STRIVA never displays arbitrary or subjective retention percentages. When baseline comparison data is missing, the system explicitly reports insufficient history.
          </p>
        </div>
      </div>
    </section>
  );
};
