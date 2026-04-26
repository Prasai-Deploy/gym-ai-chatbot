import { useState } from 'react';
import { motion } from 'motion/react';
import { Beef, Wheat, Activity, Scale, TrendingDown, TrendingUp, Flame } from 'lucide-react';

interface MacroRingProps {
  label: string;
  current: number;
  goal?: number;
  unit: string;
  color: string;
  gradientId: string;
  gradientColors: [string, string];
  icon: React.ReactNode;
}

function MacroRing({ label, current, goal, unit, color, gradientId, gradientColors, icon }: MacroRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = goal && goal > 0 ? Math.min(current / goal, 1) : 1;
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5 lg:gap-2">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 transition-all">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
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
            strokeWidth="8"
            className="text-zinc-800/30"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={goal && goal > 0 ? offset : 0}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-sm sm:text-lg lg:text-xl font-black ${color}`}>{current}</span>
          <span className="text-[8px] lg:text-[10px] uppercase font-black tracking-widest text-zinc-500">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 lg:gap-1.5 min-w-0">
        {icon}
        <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-400 truncate">{label}</span>
      </div>
      {goal ? (
        <span className="text-[9px] lg:text-[10px] font-bold text-zinc-600">
          Goal: {goal}{unit}
        </span>
      ) : null}
    </div>
  );
}

export function MacroTracker({ 
  protein = 0, carbs = 0, fats = 0, calories = 0,
  proteinGoal, carbsGoal, fatsGoal, caloriesGoal
}: { 
  protein?: number, carbs?: number, fats?: number, calories?: number,
  proteinGoal?: number, carbsGoal?: number, fatsGoal?: number, caloriesGoal?: number
}) {
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
      className="glass-panel rounded-[32px] md:rounded-[40px] p-6 md:p-8 h-full flex flex-col"
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

      {/* Calories Count */}
      <div className="mb-6 p-4 rounded-2xl border" style={{ background: 'var(--surface-elevated)', borderColor: 'var(--glass-border)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: 'var(--accent-coral)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Total Calories</span>
          </div>
          <div className="text-right flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: 'var(--accent-coral)' }}>{calories.toFixed(0)}</span>
            {caloriesGoal && caloriesGoal > 0 ? (
              <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>/ {caloriesGoal} kcal</span>
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>kcal</span>
            )}
          </div>
        </div>
        {caloriesGoal && caloriesGoal > 0 ? (
          <div className="h-2 mt-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-input)' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((calories / caloriesGoal) * 100, 100)}%`, background: 'var(--gradient-warm)' }}
            />
          </div>
        ) : null}
      </div>

      {/* Macro Rings */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-8">
        <MacroRing
          label="Protein"
          current={protein}
          goal={proteinGoal}
          unit="g"
          color="text-purple-400"
          gradientId="protein-grad"
          gradientColors={['#a855f7', '#7c3aed']}
          icon={<Beef size={12} className="text-purple-400" />}
        />
        <MacroRing
          label="Carbs"
          current={carbs}
          goal={carbsGoal}
          unit="g"
          color="text-amber-400"
          gradientId="carbs-grad"
          gradientColors={['#fbbf24', '#f59e0b']}
          icon={<Wheat size={12} className="text-amber-400" />}
        />
        <MacroRing
          label="Fats"
          current={fats}
          goal={fatsGoal}
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
