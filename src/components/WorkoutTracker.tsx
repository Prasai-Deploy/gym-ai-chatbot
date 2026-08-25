import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Play, Square, Trophy, Clock, CheckCircle2, Loader2, Zap, ChevronRight } from 'lucide-react';

interface Exercise {
  name: string;
  sets: string | number;
  reps: string;
  weight: string;
  done: boolean;
}

interface WorkoutPlan {
  id: number;
  focus: string;
  duration: string;
  calories_estimate: number;
  difficulty: string;
  exercises: Exercise[];
}

interface WorkoutSession {
  id: number;
  status: string;
  completed_exercises: string[];
  progress_percentage: number;
  calories_burned: number;
  start_time: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutTracker() {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/workout/today');

      if (res.status === 404) {
        setPlan(null);
        setSession(null);
        setExercises([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.plan) {
        const rawExercises: any[] = Array.isArray(data.plan.exercises)
          ? data.plan.exercises.filter(
              (e: any) =>
                e.name &&
                e.name !== 'Workout' &&
                e.name !== 'AI Workout' &&
                !e.description
            )
          : [];

        setPlan({ ...data.plan, exercises: rawExercises });

        if (data.session && data.session.status === 'active') {
          setSession(data.session);
          setIsActive(true);
          const completedNames: string[] = data.session.completed_exercises || [];
          setExercises(rawExercises.map((ex: any) => ({ ...ex, done: completedNames.includes(ex.name) })));
          const start = new Date(data.session.start_time).getTime();
          setElapsed(Math.floor((Date.now() - start) / 1000));
        } else if (!isActive) {
          setExercises(rawExercises.map((ex: any) => ({ ...ex, done: false })));
        }
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error('WorkoutTracker: Failed to fetch workout:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const onPlanGenerated = () => {
      setLoading(true);
      setTimeout(fetchData, 800);
    };

    window.addEventListener('plan-generated', onPlanGenerated);
    window.addEventListener('workout-completed', onPlanGenerated);

    return () => {
      window.removeEventListener('plan-generated', onPlanGenerated);
      window.removeEventListener('workout-completed', onPlanGenerated);
    };
  }, []);

  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isFinished]);

  const handleStart = async () => {
    if (!plan) return;
    setStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start workout. Please try again.');
        return;
      }

      if (data.success && data.session) {
        setSession(data.session);
        setIsActive(true);
        setIsFinished(false);
        setElapsed(0);
        setError(null);
      } else {
        setError('Unexpected response. Please refresh and try again.');
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleToggleExercise = async (name: string) => {
    if (!session) return;

    const updatedExercises = exercises.map(ex =>
      ex.name === name ? { ...ex, done: !ex.done } : ex
    );
    setExercises(updatedExercises);

    const completedExercises = updatedExercises.filter(e => e.done).map(e => e.name);
    const progressPercentage = Math.round((completedExercises.length / exercises.length) * 100);
    const caloriesBurned = Math.round((progressPercentage / 100) * (plan?.calories_estimate || 0));

    try {
      await fetch('/api/workout/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, completed_exercises: completedExercises, progress_percentage: progressPercentage, calories_burned: caloriesBurned }),
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleFinish = async () => {
    if (!session) return;
    try {
      await fetch('/api/workout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      });
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      window.dispatchEvent(new CustomEvent('workout-completed'));
    } catch (err) {
      console.error('Failed to finish workout:', err);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setIsFinished(false);
    setSession(null);
    setExercises(plan?.exercises.map(ex => ({ ...ex, done: false })) || []);
    setElapsed(0);
    setError(null);
  };

  const completedCount = exercises.filter(e => e.done).length;
  const totalCount = exercises.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (!plan || totalCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400">
          <Zap size={28} />
        </div>
        <h3 className="text-xl font-extrabold text-white font-display">No Workout Planned</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Ask the AI Coach to generate a personalized workout plan for your goals today!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card p-6 sm:p-8 flex flex-col space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-white font-display">
            {plan.focus || 'Today\'s Workout'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isActive
              ? isFinished ? 'Workout complete! 🏆' : 'Active Session in Progress...'
              : `${plan.difficulty} • ${plan.duration}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-md">
          <Dumbbell size={20} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isActive && !isFinished && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col space-y-5"
          >
            {/* Stats Summary Pill Strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Target</p>
                <p className="text-sm font-bold text-brand-400">{plan.calories_estimate > 0 ? `${plan.calories_estimate} kcal` : '—'}</p>
              </div>
              <div className="text-center border-x border-slate-800/80">
                <p className="text-[10px] uppercase font-bold text-slate-400">Exercises</p>
                <p className="text-sm font-bold text-white">{totalCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                <p className="text-sm font-bold text-white">{plan.duration}</p>
              </div>
            </div>

            {/* Exercise preview cards */}
            <div className="space-y-2">
              {exercises.slice(0, 6).map((ex, i) => (
                <div
                  key={ex.name}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80"
                >
                  <div className="w-7 h-7 rounded-xl bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{ex.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ex.sets} sets × {ex.reps}{ex.weight && ex.weight !== 'bodyweight' ? ` • ${ex.weight}` : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full py-4 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {starting ? <Loader2 className="animate-spin" size={20} /> : <><Play size={18} fill="currentColor" /> START WORKOUT ENGINE</>}
            </button>
          </motion.div>
        )}

        {isActive && !isFinished && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Active Session Timer & Meter */}
            <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <span className="text-xl font-mono font-bold text-white">{formatTime(elapsed)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">{completedCount}/{totalCount} Completed</span>
                <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Exercise Checklist */}
            <div className="space-y-2.5">
              {exercises.map((exercise) => (
                <button
                  key={exercise.name}
                  onClick={() => handleToggleExercise(exercise.name)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl text-left border transition-all ${
                    exercise.done 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-5 h-5 ${exercise.done ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-600'}`} />
                    <div>
                      <span className={`text-xs font-bold ${exercise.done ? 'line-through opacity-75' : ''}`}>{exercise.name}</span>
                      <p className="text-[11px] text-slate-400">{exercise.sets} × {exercise.reps}</p>
                    </div>
                  </div>
                  {exercise.done && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">DONE</span>}
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className={`w-full py-4 text-xs font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                allDone ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Square size={16} />
              {allDone ? 'FINISH WORKOUT 🏆' : 'COMPLETE SESSION'}
            </button>
          </motion.div>
        )}

        {isFinished && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-brand-500 flex items-center justify-center mx-auto text-white shadow-2xl shadow-brand-500/30">
              <Trophy size={40} />
            </div>
            <h4 className="text-2xl font-extrabold text-white font-display">Workout Mastered! 💪</h4>
            <p className="text-xs text-slate-400">Completed {completedCount}/{totalCount} exercises in {formatTime(elapsed)}</p>
            <button onClick={handleReset} className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all">
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
