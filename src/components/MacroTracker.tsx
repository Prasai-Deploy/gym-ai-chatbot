import { useState } from 'react';
import { motion } from 'motion/react';
import { Beef, Wheat, Activity, Scale, TrendingDown, TrendingUp, Check } from 'lucide-react';

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
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
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
            stroke="#1E293B"
            strokeWidth="7"
            className="opacity-50"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={goal && goal > 0 ? offset : 0}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base sm:text-lg font-black tracking-tight" style={{ color }}>
            {current}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-400">{unit}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{label}</span>
      </div>

      {goal ? (
        <span className="text-[10px] font-semibold text-slate-400">
          Target: {goal}{unit}
        </span>
      ) : null}
    </div>
  );
}

export function MacroTracker({ 
  protein = 0, carbs = 0, fats = 0,
  proteinGoal = 150, carbsGoal = 200, fatsGoal = 65
}: { 
  protein?: number, carbs?: number, fats?: number,
  proteinGoal?: number, carbsGoal?: number, fatsGoal?: number
}) {
  const [weight, setWeight] = useState('');
  const [weightLog, setWeightLog] = useState<{ value: number; date: string }[]>([
    { value: 74.5, date: 'Jul 24' },
    { value: 74.1, date: 'Jul 26' }
  ]);

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
      className="glass-card p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white font-display">
            Macro Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily macronutrient distribution & bodyweight logger
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* Macro Rings Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 bg-slate-950/50 p-4 sm:p-6 rounded-2xl border border-slate-800/80">
        <MacroRing
          label="Protein"
          current={protein}
          goal={proteinGoal}
          unit="g"
          color="#6366F1"
          gradientId="protein-grad"
          gradientColors={['#6366F1', '#818CF8']}
          icon={<Beef className="w-3.5 h-3.5 text-indigo-400" />}
        />
        <MacroRing
          label="Carbs"
          current={carbs}
          goal={carbsGoal}
          unit="g"
          color="#F59E0B"
          gradientId="carbs-grad"
          gradientColors={['#F59E0B', '#FBBF24']}
          icon={<Wheat className="w-3.5 h-3.5 text-amber-400" />}
        />
        <MacroRing
          label="Fats"
          current={fats}
          goal={fatsGoal}
          unit="g"
          color="#10B981"
          gradientId="fats-grad"
          gradientColors={['#10B981', '#34D399']}
          icon={<Activity className="w-3.5 h-3.5 text-emerald-400" />}
        />
      </div>

      {/* Body Weight Tracker Log */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Bodyweight Tracker</span>
          </div>
          {weightDiff !== null && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              weightDiff <= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {weightDiff <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
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
              placeholder="Log current weight (e.g. 74.5)"
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none bg-slate-900 border border-slate-800 focus:border-orange-500/60 text-white placeholder-slate-500 transition-all"
              onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              kg
            </span>
          </div>
          <button
            onClick={handleLogWeight}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Log
          </button>
        </div>

        {latestWeight && (
          <p className="text-[11px] text-slate-400">
            Latest entry: <span className="font-bold text-white">{latestWeight} kg</span> on {weightLog[weightLog.length - 1]?.date}
          </p>
        )}
      </div>
    </motion.div>
  );
}
