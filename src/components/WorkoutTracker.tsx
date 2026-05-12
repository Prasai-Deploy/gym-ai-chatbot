import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Play, Square, Trophy, Clock, CheckCircle2, Loader2, Zap } from 'lucide-react';

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

  // 1. Fetch today's workout and active session
  const fetchData = async () => {
    try {
      const res = await fetch('/api/workout/today');
      if (res.status === 404) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      
      if (data.plan) {
        setPlan(data.plan);
        
        // If session exists, resume it
        if (data.session && data.session.status === 'active') {
          setSession(data.session);
          setIsActive(true);
          
          const completedNames = data.session.completed_exercises || [];
          const mappedExercises = data.plan.exercises.map((ex: any) => ({
            ...ex,
            done: completedNames.includes(ex.name)
          }));
          setExercises(mappedExercises);
          
          // Calculate elapsed time
          const start = new Date(data.session.start_time).getTime();
          const now = new Date().getTime();
          setElapsed(Math.floor((now - start) / 1000));
        } else {
          setExercises(data.plan.exercises.map((ex: any) => ({ ...ex, done: false })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch workout:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch today's workout and active session
  useEffect(() => {
    fetchData();

    const handlePlanGenerated = () => {
      fetchData();
    };

    window.addEventListener('plan-generated', handlePlanGenerated);
    window.addEventListener('workout-completed', handlePlanGenerated);

    return () => {
      window.removeEventListener('plan-generated', handlePlanGenerated);
      window.removeEventListener('workout-completed', handlePlanGenerated);
    };
  }, []);


  // Timer logic
  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isFinished]);

  const handleStart = async () => {
    if (!plan) return;
    setStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/workout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id })
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
        setError('Unexpected response from server. Please refresh and try again.');
      }
    } catch (err) {
      console.error('Failed to start workout:', err);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleToggleExercise = async (name: string) => {
    if (!session) return;

    // Optimistic UI update
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
        body: JSON.stringify({
          session_id: session.id,
          completed_exercises: completedExercises,
          progress_percentage: progressPercentage,
          calories_burned: caloriesBurned
        })
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
        body: JSON.stringify({ session_id: session.id })
      });
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Notify other components (dashboard widgets) to refresh
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
  };

  const completedCount = exercises.filter(e => e.done).length;
  const totalCount = exercises.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!plan) {
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
          Ask the AI chatbot to generate a personalized workout plan for you!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-6 md:p-8 flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {plan.focus || 'Today\'s Workout'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {isActive ? (isFinished ? 'Workout complete!' : 'In progress...') : `${plan.difficulty} • ${plan.duration}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent-primary)]">
          <Dumbbell size={20} style={{ color: 'var(--surface-primary)' }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ---- STATE: IDLE ---- */}
        {!isActive && !isFinished && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center"
            style={{ minHeight: '40vh', justifyContent: 'center', paddingBottom: '2rem' }}
          >
             <div className="flex gap-4 mb-8">
              <div className="text-center px-4 py-2 rounded-2xl bg-[var(--surface-elevated)]">
                <p className="text-xs text-[var(--text-muted)]">Target</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>{plan.calories_estimate} kcal</p>
              </div>
              <div className="text-center px-4 py-2 rounded-2xl bg-[var(--surface-elevated)]">
                <p className="text-xs text-[var(--text-muted)]">Exercises</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xs mb-4 px-4 py-3 rounded-2xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {error}
              </motion.div>
            )}
            <motion.button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary w-full max-w-xs px-10 py-5 rounded-[24px] text-lg font-bold inline-flex items-center justify-center gap-3"
              style={{ opacity: starting ? 0.7 : 1, cursor: starting ? 'not-allowed' : 'pointer' }}
              whileHover={starting ? {} : { scale: 1.03 }}
              whileTap={starting ? {} : { scale: 0.97 }}
            >
              {starting
                ? <><Loader2 size={22} className="animate-spin" /> STARTING...</>
                : <><Play size={22} fill="currentColor" /> START WORKOUT</>
              }
            </motion.button>
          </motion.div>
        )}

        {/* ---- STATE: ACTIVE ---- */}
        {isActive && !isFinished && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Timer & Progress */}
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
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-input)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--accent-primary)' }}
                    animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <motion.button
                  key={exercise.name}
                  onClick={() => handleToggleExercise(exercise.name)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
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
                      animate={{
                        opacity: exercise.done ? 0.4 : 1,
                        textDecoration: exercise.done ? 'line-through' : 'none',
                      }}
                      style={{ color: 'var(--text-primary)' }}
                      transition={{ duration: 0.2 }}
                    >
                      {exercise.name}
                    </motion.span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {exercise.sets} × {exercise.reps} • {exercise.weight}
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
              Finish Workout
            </motion.button>
          </motion.div>
        )}

        {/* ---- STATE: FINISHED ---- */}
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
            <button
              onClick={handleReset}
              className="btn-primary px-8 py-3 rounded-xl text-sm"
            >
              New Workout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

