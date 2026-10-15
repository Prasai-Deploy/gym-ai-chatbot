import React from 'react';
import { Dumbbell, Users, UserCheck, UserX } from 'lucide-react';
import { TrainerAnalyticsData } from '../../../../api/analyticsApi';

interface Props {
  data?: TrainerAnalyticsData;
}

export const TrainerAnalyticsCard: React.FC<Props> = ({ data }) => {
  if (!data || !data.hasData || data.totalTrainers === 0) {
    return (
      <div className="bg-[#0a0d14] p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Trainer Workload & Caseloads</h2>
              <p className="text-xs text-slate-400">Client assignments and roster distribution</p>
            </div>
          </div>
        </div>
        <div className="py-12 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-400">No trainer assignments yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Assigning members to trainers on the Trainers page will automatically establish caseload telemetry.
          </p>
        </div>
      </div>
    );
  }

  const {
    totalTrainers,
    assignedMembers,
    unassignedMembers,
    avgMembersPerTrainer,
    rosterDistribution,
  } = data;

  return (
    <section
      aria-labelledby="trainer-analytics-heading"
      className="bg-[#0a0d14] p-5 sm:p-6 rounded-2xl border border-white/[0.06] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h2 id="trainer-analytics-heading" className="text-base font-bold text-white tracking-tight">
              Trainer Caseloads & Allocation
            </h2>
            <p className="text-xs text-slate-400">
              Active client distributions from trainer_member_assignments records
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06] self-start sm:self-auto">
          {totalTrainers} active coaches
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Coaches
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-mono">{totalTrainers}</span>
            <span className="text-xs text-slate-500">trainers</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Assigned Members
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{assignedMembers}</span>
            <span className="text-xs text-slate-500">clients</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Unassigned Members
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-400 font-mono">{unassignedMembers}</span>
            <span className="text-xs text-slate-500">unassigned</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Avg Clients / Coach
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-400 font-mono">{avgMembersPerTrainer}</span>
            <span className="text-xs text-slate-500">ratio</span>
          </div>
        </div>
      </div>

      {/* Roster Distribution Breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Coach Caseload Breakdown
        </h3>

        {rosterDistribution.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rosterDistribution.map((t) => {
              // Calculate proportion against maximum caseload for visual progress
              const pct = assignedMembers > 0 ? Math.round((t.assignedMembersCount / assignedMembers) * 100) : 0;
              return (
                <div
                  key={t.trainerId}
                  className="bg-[#050608] p-3.5 rounded-xl border border-white/[0.05] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600/30 to-purple-400/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs shrink-0">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.email || 'Personal Trainer'}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-purple-400 font-mono">
                      {t.assignedMembersCount}
                    </span>
                    <span className="text-[11px] text-slate-500 block">clients ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#050608] rounded-xl border border-white/[0.05]">
            No trainer assignments recorded yet.
          </div>
        )}
      </div>
    </section>
  );
};
