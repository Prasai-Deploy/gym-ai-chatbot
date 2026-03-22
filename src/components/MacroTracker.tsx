import { useState } from 'react';
import { motion } from 'motion/react';
import { Beef, Wheat, Activity, Scale, TrendingDown, TrendingUp } from 'lucide-react';

interface MacroRingProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  gradientId: string;
  gradientColors: [string, string];
  icon: React.ReactNode;
}

function MacroRing({ label, current, goal, unit, color, gradientId, gradientColors, icon }: MacroRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / goal, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 md:w-28 md:h-28">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-zinc-800/30"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring-circle"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg md:text-xl font-bold ${color}`}>{current}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        Goal: {goal}{unit}
      </span>
    </div>
  );
}

export function MacroTracker({ protein = 0, carbs = 0, fats = 0 }: { protein?: number, carbs?: number, fats?: number }) {
  const [weight, setWeight] = useState('');
  const [weightLog, setWeightLog] = useState<{ value: number; date: string }[]>([]);

  const handleLogWeight = () => {
    if (!weight || isNaN(Number(weight))) return;
    setWeightLog(prev => [...prev, {
      value: Number(weight),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }]);
    setWeight('');
  };

  const latestWeight = weightLog[weightLog.length - 1]?.value;
  const prevWeight = weightLog[weightLog.length - 2]?.value;
  const weightDiff = latestWeight && prevWeight ? latestWeight - prevWeight : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-panel rounded-3xl p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Macro & Metric Tracker
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Today's nutrition breakdown
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
          <Activity size={20} className="text-white" />
        </div>
      </div>

      {/* Macro Rings */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
        <MacroRing
          label="Protein"
          current={protein}
          goal={180}
          unit="g"
          color="text-purple-400"
          gradientId="protein-grad"
          gradientColors={['#a855f7', '#7c3aed']}
          icon={<Beef size={12} className="text-purple-400" />}
        />
        <MacroRing
          label="Carbs"
          current={carbs}
          goal={250}
          unit="g"
          color="text-amber-400"
          gradientId="carbs-grad"
          gradientColors={['#fbbf24', '#f59e0b']}
          icon={<Wheat size={12} className="text-amber-400" />}
        />
        <MacroRing
          label="Fats"
          current={fats}
          goal={65}
          unit="g"
          color="text-rose-400"
          gradientId="fats-grad"
          gradientColors={['#fb7185', '#e11d48']}
          icon={<Activity size={12} className="text-rose-400" />}
        />
      </div>


      {/* Weight Logger */}
      <div className="border-t pt-6" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Weight Log
            </span>
          </div>
          {weightDiff !== null && (
            <div className={`flex items-center gap-1 text-xs font-bold ${weightDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {weightDiff <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="Enter weight"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600"
              style={{ background: 'var(--surface-input)', color: 'var(--text-primary)' }}
              onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              kg
            </span>
          </div>
          <button
            onClick={handleLogWeight}
            className="btn-gradient px-5 py-3 rounded-xl text-sm"
          >
            Log
          </button>
        </div>
        {latestWeight && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Latest: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{latestWeight} kg</span>
            {' '}on {weightLog[weightLog.length - 1]?.date}
          </p>
        )}
      </div>
    </motion.div>
  );
}
