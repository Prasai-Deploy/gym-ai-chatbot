import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { pageVariants } from '../theme/animations';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, Dumbbell, Scale, Flame, HeartPulse } from 'lucide-react';

const WEEKLY_DATA = [
  { day: 'Mon', volume: 12400, weight: 74.8, cals: 520, recovery: 82 },
  { day: 'Tue', volume: 14200, weight: 74.6, cals: 610, recovery: 85 },
  { day: 'Wed', volume: 10800, weight: 74.5, cals: 480, recovery: 89 },
  { day: 'Thu', volume: 16500, weight: 74.3, cals: 680, recovery: 80 },
  { day: 'Fri', volume: 18200, weight: 74.2, cals: 740, recovery: 88 },
  { day: 'Sat', volume: 15400, weight: 74.1, cals: 590, recovery: 91 },
  { day: 'Sun', volume: 19100, weight: 74.0, cals: 810, recovery: 94 },
];

export const V3ProgressPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [activeMetric, setActiveMetric] = useState<'volume' | 'weight' | 'cals' | 'recovery'>('volume');

  return (
    <div className="min-h-screen bg-[#090B10] text-white font-sans pt-20 pb-32 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
      <TopNav />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-white">Apple Health Progress Analytics</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Track strength velocity, volume load, and recovery trends.</p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#131722] border border-white/10 p-1 rounded-2xl self-start">
            {(['weekly', 'monthly', 'yearly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 text-xs font-bold capitalize rounded-xl transition-all ${
                  timeframe === t ? 'bg-[#F97316] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { id: 'volume', label: 'Volume Load', val: '19,100 kg', change: '+12%', icon: <Dumbbell className="w-4 h-4 text-orange-400" /> },
            { id: 'weight', label: 'Body Weight', val: '74.0 kg', change: '-0.8 kg', icon: <Scale className="w-4 h-4 text-cyan-400" /> },
            { id: 'cals', label: 'Calories Burned', val: '810 kcal', change: '+15%', icon: <Flame className="w-4 h-4 text-amber-400" /> },
            { id: 'recovery', label: 'Sleep Recovery', val: '94%', change: 'Optimal', icon: <HeartPulse className="w-4 h-4 text-emerald-400" /> },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeMetric === m.id
                  ? 'bg-[#1A2030] border-orange-500/50 v3-glow-orange'
                  : 'bg-[#131722] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {m.icon}
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  {m.change}
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{m.label}</span>
              <span className="text-xl font-extrabold text-white font-display tabular-nums mt-0.5 block">{m.val}</span>
            </button>
          ))}
        </div>

        {/* Large Recharts Trend Visualization (No Dense Tables!) */}
        <Card variant="default" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#F97316]" />
              <h2 className="text-lg font-extrabold text-white font-display capitalize">
                {activeMetric} Velocity Trend
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">Peak Performance Window</span>
          </div>

          <div className="h-64 sm:h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131722', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16 }}
                  itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey={activeMetric} stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#area-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <MobileDock />
    </div>
  );
};
