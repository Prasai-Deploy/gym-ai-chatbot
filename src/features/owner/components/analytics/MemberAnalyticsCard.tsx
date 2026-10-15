import React from 'react';
import { Users, UserPlus, TrendingUp, UserMinus, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { MemberAnalyticsData } from '../../../../api/analyticsApi';

interface Props {
  data?: MemberAnalyticsData;
}

export const MemberAnalyticsCard: React.FC<Props> = ({ data }) => {
  if (!data || !data.hasData || data.totalMembers === 0) {
    return (
      <div className="bg-[#0a0d14] p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Member Growth & Retention</h2>
              <p className="text-xs text-slate-400">Roster acquisition and active status</p>
            </div>
          </div>
        </div>
        <div className="py-12 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-400">Not enough member history to show a trend.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            New members added to the organization roster will automatically establish telemetry.
          </p>
        </div>
      </div>
    );
  }

  const {
    totalMembers,
    activeMembers,
    trialMembers,
    inactiveMembers,
    newMembers,
    growth,
    trendSeries,
  } = data;

  const isGrowthPositive = growth.change >= 0;

  return (
    <section
      aria-labelledby="member-analytics-heading"
      className="bg-[#0a0d14] p-5 sm:p-6 rounded-2xl border border-white/[0.06] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 id="member-analytics-heading" className="text-base font-bold text-white tracking-tight">
              Member Growth & Distribution
            </h2>
            <p className="text-xs text-slate-400">Authoritative roster statistics from organization records</p>
          </div>
        </div>

        {/* Growth Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              isGrowthPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{growth.comparisonText}</span>
          </span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Members
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-mono">{totalMembers}</span>
            <span className="text-xs text-slate-500">registered</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Members
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{activeMembers}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              New in Window
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-400 font-mono">+{newMembers}</span>
            <span className="text-[11px] text-slate-500">joined</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <UserMinus className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Trial / Inactive
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-400 font-mono">{trialMembers}</span>
            <span className="text-[11px] text-slate-500">
              trial • {inactiveMembers} inactive
            </span>
          </div>
        </div>
      </div>

      {/* Chart Visual: Real Recharts AreaChart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">Cumulative Member Growth Trajectory</span>
          <span className="text-[11px] font-mono text-slate-500">Real database timestamps</span>
        </div>

        <div className="h-60 w-full bg-[#050608] p-3 rounded-xl border border-white/[0.05]">
          {trendSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="memberGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val: string) => val.slice(5)} // MM-DD
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeMembers"
                  name="Total Members"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memberGrowthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Not enough data points to plot curve
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
