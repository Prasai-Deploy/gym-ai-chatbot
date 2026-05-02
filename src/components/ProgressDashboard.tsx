import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts';
import {
  Flame, Droplets, Dumbbell, TrendingUp, TrendingDown,
  Zap, Clock, ChevronDown, Activity, Apple, Trophy
} from 'lucide-react';
import { motion } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Stats {
  streak: number; workoutsDone: number; weeklyCalories: number;
  avgWater: number; caloriesTrend: 'up' | 'down'; waterTrend: 'up' | 'down';
}
interface ActivityDay { day: string; minutes: number; }
interface Workout {
  id: number; workout_name: string; date: string;
  duration_minutes: number; difficulty: 'Easy' | 'Medium' | 'Hard';
}
interface NutritionData {
  actuals: { protein: number; carbs: number; fat: number; calories: number };
  targets: { protein: number; carbs: number; fat: number; calories: number };
}
interface LeaderboardEntry {
  rank: number; user_id: number; name: string; avatar: string;
  current_streak: number; isMe: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: string | number; unit?: string;
  icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string; gradient?: string; delay?: number;
}

function StatCard({ label, value, unit, icon, trend = 'neutral', trendLabel, gradient, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="glass-panel rounded-2xl p-5 flex flex-col gap-3 glass-panel-hover"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: gradient || 'var(--surface-elevated)' }}>{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
        {unit && <span className="text-sm font-semibold pb-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {trend !== 'neutral' && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendLabel}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Macro Ring
// ─────────────────────────────────────────────────────────────────────────────
function MacroRing({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const dashoffset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[120px]">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle className="progress-ring-circle" cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm sm:text-base font-black" style={{ color: 'var(--text-primary)' }}>{consumed}g</span>
          <span className="text-[9px] sm:text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>/{target}g</span>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{Math.round(pct * 100)}% of target</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty Badge
// ─────────────────────────────────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: 'Easy' | 'Medium' | 'Hard' }) {
  const map = {
    Easy:   { color: 'text-emerald-400', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)' },
    Medium: { color: 'text-amber-400',   bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
    Hard:   { color: 'text-red-400',     bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)' },
  };
  const s = map[level];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${s.color}`} style={{ background: s.bg, borderColor: s.border }}>{level}</span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="glass-panel px-3 py-2 rounded-xl text-sm">
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p style={{ color: '#c084fc' }}>{payload[0].value} min</p>
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Card
// ─────────────────────────────────────────────────────────────────────────────
function LeaderboardCard() {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gamification/leaderboard');
        if (res.ok) setBoard(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="glass-panel rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Trophy size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Streak Leaderboard</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Top 5 by current streak</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{Array(3).fill(null).map((_, i) => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-elevated)' }} />)}</div>
      ) : board.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Trophy size={28} className="mx-auto mb-2 opacity-30" />No streak data yet. Be the first on the board!
        </div>
      ) : (
        <div className="space-y-2">
          {board.map((entry, i) => (
            <motion.div key={entry.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-4 p-3 rounded-2xl transition-all"
              style={{ background: entry.isMe ? 'rgba(124,58,237,0.15)' : 'var(--surface-elevated)', border: entry.isMe ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--glass-border)', boxShadow: entry.isMe ? '0 0 12px rgba(124,58,237,0.15)' : undefined }}>
              <span className="text-lg w-8 text-center flex-shrink-0">{rankEmojis[i]}</span>
              <img src={entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=7c3aed&color=fff`}
                alt={entry.name} className="w-9 h-9 rounded-full flex-shrink-0" style={{ border: '1px solid var(--glass-border)' }} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: entry.isMe ? '#c084fc' : 'var(--text-primary)' }}>
                  {entry.name} {entry.isMe && <span className="text-[10px] opacity-70">(You)</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-black" style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c' }}>
                🔥 {entry.current_streak}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function ProgressDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<{ days: ActivityDay[]; average: number }>({ days: [], average: 0 });
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPage, setWorkoutPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, workoutsRes, nutritionRes] = await Promise.all([
        fetch('/api/progress/stats'), fetch('/api/progress/activity'),
        fetch('/api/progress/workouts?page=1'), fetch('/api/progress/nutrition'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (workoutsRes.ok) { const d = await workoutsRes.json(); setWorkouts(d.workouts); setHasMore(d.hasMore); }
      if (nutritionRes.ok) setNutrition(await nutritionRes.json());
    } catch (e) { console.error('Progress fetch error:', e); }
    finally { setLoading(false); }
  }, []);

  const loadMoreWorkouts = async () => {
    const nextPage = workoutPage + 1;
    const res = await fetch(`/api/progress/workouts?page=${nextPage}`);
    if (res.ok) { const d = await res.json(); setWorkouts(prev => [...prev, ...d.workouts]); setHasMore(d.hasMore); setWorkoutPage(nextPage); }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 h-28 animate-pulse">
              <div className="w-1/2 h-2 bg-white/5 rounded mb-4" />
              <div className="w-3/4 h-8 bg-white/5 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-panel rounded-3xl p-6 h-64 animate-pulse" />
        <div className="glass-panel rounded-3xl p-6 h-48 animate-pulse" />
      </div>
    );
  }

  const macroRings = nutrition ? [
    { label: 'Protein', consumed: nutrition.actuals.protein, target: nutrition.targets.protein, color: '#7c3aed' },
    { label: 'Carbs',   consumed: nutrition.actuals.carbs,   target: nutrition.targets.carbs,   color: '#ec4899' },
    { label: 'Fat',     consumed: nutrition.actuals.fat,     target: nutrition.targets.fat,     color: '#06b6d4' },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">

      <div>
        <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>Progress Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your performance at a glance this week</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard delay={0.05} label="Current Streak" value={stats?.streak ?? 0} unit="days" icon={<Zap size={16} className="text-amber-400" />} gradient="rgba(245,158,11,0.15)" trend={stats && stats.streak > 0 ? 'up' : 'neutral'} trendLabel={stats && stats.streak > 1 ? `${stats.streak} days in a row!` : 'Start today!'} />
        <StatCard delay={0.1} label="Workouts Done" value={stats?.workoutsDone ?? 0} unit="this month" icon={<Dumbbell size={16} className="text-purple-400" />} gradient="rgba(124,58,237,0.15)" trend={stats && stats.workoutsDone > 8 ? 'up' : 'down'} trendLabel={stats && stats.workoutsDone > 8 ? 'On track!' : 'Keep going!'} />
        <StatCard delay={0.15} label="Calories Burned" value={(stats?.weeklyCalories ?? 0).toLocaleString()} unit="this week" icon={<Flame size={16} className="text-orange-400" />} gradient="rgba(249,115,22,0.15)" trend={stats?.caloriesTrend ?? 'neutral'} trendLabel={stats?.caloriesTrend === 'up' ? 'Above last week' : 'Below last week'} />
        <StatCard delay={0.2} label="Daily Avg Water" value={stats?.avgWater.toFixed(1) ?? '0.0'} unit="L / day" icon={<Droplets size={16} className="text-cyan-400" />} gradient="rgba(6,182,212,0.15)" trend={stats?.waterTrend ?? 'neutral'} trendLabel={stats?.waterTrend === 'up' ? 'Well hydrated!' : 'Drink more water'} />
      </div>

      {/* Weekly Activity Chart */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }} className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Weekly Activity</h2><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Active minutes per day</p></div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}><div className="border-t border-dashed border-purple-400" style={{ width: 20 }} />Avg {activity.average} min</div>
        </div>
        {activity.days.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activity.days} barSize={32} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#ec4899" stopOpacity={0.7} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(t) => (window.innerWidth < 640 ? t.charAt(0) : t)}
              />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
              {activity.average > 0 && <ReferenceLine y={activity.average} stroke="#a855f7" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: 'avg', fill: '#a855f7', fontSize: 10, position: 'insideTopRight' }} />}
              <Bar dataKey="minutes" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-52 flex items-center justify-center border-2 border-dashed rounded-2xl text-sm" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
            <div className="text-center"><Activity size={32} className="mx-auto mb-2 opacity-30" />No activity logged yet this week.<br /><span className="text-xs">Log a workout to see your chart!</span></div>
          </div>
        )}
      </motion.section>

      {/* Nutrition + Leaderboard (side by side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Nutrition Summary</h2><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Weekly avg vs your targets</p></div>
            {nutrition && <div className="text-right"><div className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{nutrition.actuals.calories.toLocaleString()} kcal</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {nutrition.targets.calories.toLocaleString()} target</div></div>}
          </div>
          {macroRings.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-around items-center px-2">
              {macroRings.map(ring => <MacroRing key={ring.label} {...ring} />)}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center border-2 border-dashed rounded-2xl text-sm" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
              <div className="text-center"><Apple size={28} className="mx-auto mb-2 opacity-30" />No nutrition data logged yet.</div>
            </div>
          )}
        </motion.section>
        <LeaderboardCard />
      </div>

      {/* Workout History */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }} className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Workout History</h2><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your recent training sessions</p></div>
        </div>
        {workouts.length > 0 ? (
          <div className="space-y-2">
            {workouts.map((w, i) => (
              <div key={w.id} className="relative group overflow-hidden rounded-2xl">
                {/* Delete background action */}
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-end px-6 rounded-2xl border border-red-500/30">
                  <span className="text-red-400 font-bold text-xs uppercase tracking-widest">Delete</span>
                </div>
                
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: -100, right: 0 }}
                  dragElastic={0.1}
                  initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4 sm:p-5 rounded-2xl glass-panel-hover transition-colors relative z-10 touch-pan-y"
                  style={{ 
                    background: 'var(--surface-elevated)', 
                    border: '1px solid var(--glass-border)',
                    minHeight: '68px'
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.1)' }}><Dumbbell size={18} className="text-purple-400" /></div>
                    <div>
                      <div className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{w.workout_name}</div>
                      <div className="text-[11px] sm:text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {w.date}{w.duration_minutes > 0 && (<><span>·</span><span className="flex items-center gap-1"><Clock size={10} /> {w.duration_minutes} min</span></>)}
                      </div>
                    </div>
                  </div>
                  <DifficultyBadge level={w.difficulty} />
                </motion.div>
              </div>
            ))}
            {hasMore && <button onClick={loadMoreWorkouts} className="w-full py-4 mt-2 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all hover:bg-white/5 active:scale-95" style={{ color: 'var(--text-muted)', border: '1px dashed var(--glass-border)' }}><ChevronDown size={16} /> Load more</button>}
          </div>
        ) : (
          <div className="h-36 flex items-center justify-center border-2 border-dashed rounded-2xl text-sm" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}>
            <div className="text-center"><Dumbbell size={28} className="mx-auto mb-2 opacity-30" />No workouts logged yet. Start tracking your sessions!</div>
          </div>
        )}
      </motion.section>
    </div>
  );
}
