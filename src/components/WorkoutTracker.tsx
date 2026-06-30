import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Play, Square, Trophy, Clock, CheckCircle2, Loader2, Zap, ChevronRight, RefreshCw } from 'lucide-react';

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

  // ── Fetch today's workout plan and active session ─────────────────────────
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
        // Normalise exercise shape — guard against malformed data
        const rawExercises: any[] = Array.isArray(data.plan.exercises)
          ? data.plan.exercises.filter(
              (e: any) =>
                e.name &&
                e.name !== 'Workout' &&
                e.name !== 'AI Workout' &&
                !e.description // filter out the garbage "description" exercise
            )
          : [];

        setPlan({ ...data.plan, exercises: rawExercises });

        if (data.session && data.session.status === 'active') {
          setSession(data.session);
          setIsActive(true);
          const completedNames: string[] = data.session.completed_exercises || [];
          setExercises(rawExercises.map((ex: any) => ({ ...ex, done: completedNames.includes(ex.name) })));
          // Resume elapsed time
          const start = new Date(data.session.start_time).getTime();
          setElapsed(Math.floor((Date.now() - start) / 1000));
        } else if (!isActive) {
          // Only reset exercises if we're not mid-session
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

  // Initial load + listen for chatbot plan events
  useEffect(() => {
    fetchData();

    const onPlanGenerated = () => {
      setLoading(true);
      // Small delay so the DB write finishes before we re-fetch
      setTimeout(fetchData, 800);
    };

    window.addEventListener('plan-generated', onPlanGenerated);
    window.addEventListener('workout-completed', onPlanGenerated);

    return () => {
      window.removeEventListener('plan-generated', onPlanGenerated);
      window.removeEventListener('workout-completed', onPlanGenerated);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isFinished]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  // ── No Plan State ─────────────────────────────────────────────────────────
  if (!plan || totalCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] flex items-center justify-center mx-auto mb-4">
          <Zap size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Workout Planned</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ask the AI Coach to generate a personalized workout plan for you!
        </p>
        <p className="text-xs px-4 py-2 rounded-xl inline-block" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
          💬 Try: <em>"Generate my workout plan for today"</em>
        </p>
      </motion.div>
    );
  }

  // ── Main Workout Card ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-6 md:p-8 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {plan.focus || 'Today\'s Workout'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {isActive
              ? isFinished ? 'Workout complete! 🏆' : 'In progress...'
              : `${plan.difficulty} • ${plan.duration}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent-primary)]">
          <Dumbbell size={20} style={{ color: 'var(--surface-primary)' }} />
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ─── IDLE STATE: plan preview + exercise list ─── */}
        {!isActive && !isFinished && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col"
          >
            {/* Stats row */}
            <div className="flex gap-3 mb-5">
              <div className="text-center px-4 py-2 rounded-2xl flex-1 bg-[var(--surface-elevated)]">
                <p className="text-xs text-[var(--text-muted)]">Target</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {plan.calories_estimate > 0 ? `${plan.calories_estimate} kcal` : '—'}
                </p>
              </div>
              <div className="text-center px-4 py-2 rounded-2xl flex-1 bg-[var(--surface-elevated)]">
                <p className="text-xs text-[var(--text-muted)]">Exercises</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
              </div>
              <div className="text-center px-4 py-2 rounded-2xl flex-1 bg-[var(--surface-elevated)]">
                <p className="text-xs text-[var(--text-muted)]">Duration</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{plan.duration}</p>
              </div>
            </div>

            {/* Exercise preview list */}
            <div className="space-y-2 mb-5">
              {exercises.slice(0, 6).map((ex, i) => (
                <motion.div
                  key={ex.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--accent-primary)', color: 'var(--surface-primary)' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {ex.sets} sets × {ex.reps}{ex.weight && ex.weight !== 'bodyweight' ? ` • ${ex.weight}` : ''}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </motion.div>
              ))}
              {exercises.length > 6 && (
                <p className="text-center text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                  +{exercises.length - 6} more exercises
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mb-4 px-4 py-3 rounded-2xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {error}
              </motion.div>
            )}

            {/* START WORKOUT button */}
            <motion.button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary w-full py-5 rounded-[24px] text-lg font-bold inline-flex items-center justify-center gap-3"
              style={{ opacity: starting ? 0.7 : 1, cursor: starting ? 'not-allowed' : 'pointer' }}
              whileHover={starting ? {} : { scale: 1.02 }}
              whileTap={starting ? {} : { scale: 0.98 }}
            >
              {starting
                ? <><Loader2 size={22} className="animate-spin" /> STARTING...</>
                : <><Play size={22} fill="currentColor" /> START WORKOUT</>
              }
            </motion.button>
          </motion.div>
        )}

        {/* ─── ACTIVE STATE: exercise checklist + timer ─── */}
        {isActive && !isFinished && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Timer & Progress bar */}
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatTime(elapsed)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {completedCount}/{totalCount}
                </span>
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-input)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--accent-primary)' }}
                    animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Exercise checklist */}
            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <motion.button
                  key={exercise.name}
                  onClick={() => handleToggleExercise(exercise.name)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors cursor-pointer"
                  style={{
                    background: exercise.done ? 'var(--accent-primary-hover)' : 'var(--surface-card)',
                    border: `1px solid ${exercise.done ? 'var(--accent-primary-hover)' : 'var(--border-subtle)'}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      border: exercise.done ? 'none' : '2px solid var(--text-muted)',
                      background: exercise.done ? 'var(--accent-primary)' : 'transparent',
                    }}
                    animate={exercise.done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {exercise.done && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <CheckCircle2 size={16} style={{ color: 'var(--surface-primary)' }} />
                      </motion.div>
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <motion.span
                      className="block text-sm font-semibold truncate"
                      animate={{ opacity: exercise.done ? 0.45 : 1 }}
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: exercise.done ? 'line-through' : 'none',
                      }}
                    >
                      {exercise.name}
                    </motion.span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {exercise.sets} × {exercise.reps}
                      {exercise.weight && exercise.weight !== 'bodyweight' ? ` • ${exercise.weight}` : ''}
                    </span>
                  </div>

                  {exercise.done && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Done
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Finish button */}
            <motion.button
              onClick={handleFinish}
              className="w-full mt-6 py-4 rounded-[24px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              style={{
                background: allDone ? 'var(--accent-primary)' : 'var(--surface-elevated)',
                color: allDone ? '#121212' : 'var(--text-secondary)',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Square size={16} />
              {allDone ? 'Finish Workout 🏆' : 'Finish Workout'}
            </motion.button>
          </motion.div>
        )}

        {/* ─── FINISHED STATE ─── */}
        {isFinished && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--accent-primary)]"
            >
              <Trophy size={36} style={{ color: 'var(--surface-primary)' }} />
            </motion.div>
            <h4 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Great Workout! 💪
            </h4>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              {completedCount}/{totalCount} exercises completed
            </p>
            <p className="text-sm font-mono mb-6" style={{ color: 'var(--text-muted)' }}>
              Duration: {formatTime(elapsed)}
            </p>
            <button onClick={handleReset} className="btn-primary px-8 py-3 rounded-xl text-sm">
              Done
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
