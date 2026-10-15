import React from 'react';
import { CalendarCheck, Clock, Flame, Calendar, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { AttendanceAnalyticsData } from '../../../../api/analyticsApi';

interface Props {
  data?: AttendanceAnalyticsData;
}

export const AttendanceAnalyticsCard: React.FC<Props> = ({ data }) => {
  if (!data || !data.hasData || data.totalVisits === 0) {
    return (
      <div className="bg-[#0a0d14] p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Attendance & Floor Traffic</h2>
              <p className="text-xs text-slate-400">Facility check-ins from canonical attendance logs</p>
            </div>
          </div>
        </div>
        <div className="py-12 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-400">No attendance history yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Check-ins recorded at the front desk will populate real analytical curves and peak time profiles.
          </p>
        </div>
      </div>
    );
  }

  const {
    totalVisits,
    uniqueMembers,
    avgDailyVisits,
    avgVisitsPerMember,
    avgDurationMinutes,
    peakHour,
    peakDay,
    visitsComparison,
    trendSeries,
    hourlyDistribution,
  } = data;

  const isVisitGrowthPositive = visitsComparison.change >= 0;

  // Filter hourly distribution to active hours (e.g. 05:00 to 22:00) for cleaner display
  const activeHours = hourlyDistribution.filter((_, idx) => idx >= 5 && idx <= 22);

  return (
    <section
      aria-labelledby="attendance-analytics-heading"
      className="bg-[#0a0d14] p-5 sm:p-6 rounded-2xl border border-white/[0.06] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 id="attendance-analytics-heading" className="text-base font-bold text-white tracking-tight">
              Attendance & Facility Behavior
            </h2>
            <p className="text-xs text-slate-400">Real check-in records from verified turnstile & desk logs</p>
          </div>
        </div>

        {/* Comparison Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              isVisitGrowthPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{visitsComparison.comparisonText}</span>
          </span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Check-ins
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-mono">{totalVisits}</span>
            <span className="text-xs text-slate-500">visits</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Unique Attendees
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{uniqueMembers}</span>
            <span className="text-xs text-slate-500">members</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Daily Avg & Duration
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-orange-400 font-mono">{avgDailyVisits}</span>
            <span className="text-xs text-slate-500">/day • {avgDurationMinutes}m avg</span>
          </div>
        </div>

        <div className="bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peak Traffic Period
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-400 font-mono">{peakHour}</span>
            <span className="text-xs text-slate-500">on {peakDay}</span>
          </div>
        </div>
      </div>

      {/* Two Column Visual Layout: Daily Trend & Hourly Floor Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Daily Check-in Volume Trend */}
        <div className="space-y-2 bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Daily Attendance Trend</span>
            <span className="text-[11px] font-mono text-slate-500">Avg {avgVisitsPerMember} visits/member</span>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendSeries} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val: string) => val.slice(5)}
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
                  dataKey="visits"
                  name="Check-ins"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#attendanceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Hourly Floor Occupancy Curve */}
        <div className="space-y-2 bg-[#050608] p-4 rounded-xl border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Floor Traffic by Hour of Day</span>
            <span className="text-[11px] font-mono text-slate-500">Peak: {peakHour}</span>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeHours} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  interval={2}
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
                <Bar
                  dataKey="visits"
                  name="Hourly Visits"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
