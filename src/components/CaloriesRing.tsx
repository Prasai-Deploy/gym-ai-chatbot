import React from 'react';
import { motion } from 'motion/react';
import { Flame, Zap, Target } from 'lucide-react';

interface CaloriesRingProps {
  burned: number;
  goal: number;
}

export function CaloriesRing({ burned, goal }: CaloriesRingProps) {
  const effectiveGoal = goal && goal > 0 ? goal : 2000;
  const progress = Math.min(burned / effectiveGoal, 1);
  const radius = 82;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="glass-card p-6 sm:p-8 relative overflow-hidden"
    >
      <div className="flex flex-col items-center">
        {/* Glow backdrop behind ring */}
        <div className="absolute w-40 h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        {/* Ring Graphic */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="cal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Track Circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#1E293B"
              strokeWidth={strokeWidth}
              className="opacity-50"
            />

            {/* Progress Arc */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#cal-gradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              filter="url(#glow)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center Text Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-1 text-brand-400">
              <Flame className="w-5 h-5 fill-brand-400/20" />
            </div>
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight tabular-nums">
              {burned.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
              KCAL BURNED
            </span>
          </div>
        </div>

        {/* Goal Statistics Pill Strip */}
        <div className="mt-6 w-full max-w-sm grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
          <div className="text-center">
            <span className="text-sm font-bold text-brand-400">{pct}%</span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Progress</p>
          </div>
          <div className="text-center border-x border-slate-800/80 px-2">
            <span className="text-sm font-bold text-white tabular-nums">{effectiveGoal.toLocaleString()}</span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Target Kcal</p>
          </div>
          <div className="text-center">
            <span className={`text-sm font-bold tabular-nums ${burned >= effectiveGoal ? 'text-emerald-400' : 'text-slate-300'}`}>
              {Math.max(effectiveGoal - burned, 0).toLocaleString()}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Remaining</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
