import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Play, Square, Trophy, Clock, CheckCircle2 } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  done: boolean;
}

const DEFAULT_EXERCISES: Exercise[] = [
  { id: '1', name: 'Barbell Squats', sets: '4 × 10', done: false },
  { id: '2', name: 'Bench Press', sets: '4 × 8', done: false },
  { id: '3', name: 'Deadlift', sets: '3 × 6', done: false },
  { id: '4', name: 'Overhead Press', sets: '3 × 10', done: false },
  { id: '5', name: 'Barbell Rows', sets: '4 × 10', done: false },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutTracker() {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleStart = () => {
    setIsActive(true);
    setIsFinished(false);
    setExercises(DEFAULT_EXERCISES);
    setElapsed(0);
  };

  const handleToggleExercise = (id: string) => {
    setExercises(prev =>
      prev.map(ex => (ex.id === id ? { ...ex, done: !ex.done } : ex))
    );
  };

  const handleFinish = () => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsFinished(false);
    setExercises(DEFAULT_EXERCISES);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const completedCount = exercises.filter(e => e.done).length;
  const totalCount = exercises.length;
  const allDone = completedCount === totalCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card p-6 md:p-8 flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Workout Tracker
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {isActive ? (isFinished ? 'Workout complete!' : 'In progress...') : 'Ready to train?'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
          <Dumbbell size={20} className="text-white" />
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
            style={{ minHeight: '40vh', justifyContent: 'flex-end', paddingBottom: '2rem' }}
          >
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {totalCount} exercises • ~45 min
            </p>
            <motion.button
              onClick={handleStart}
              className="btn-accent w-full max-w-xs px-10 py-5 rounded-[24px] text-lg font-bold inline-flex items-center justify-center gap-3"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={22} fill="#121212" />
              START WORKOUT
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
                    style={{ background: 'var(--gradient-accent)' }}
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
                  key={exercise.id}
                  onClick={() => handleToggleExercise(exercise.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors cursor-pointer"
                  style={{
                    background: exercise.done ? 'rgba(0, 255, 194, 0.06)' : 'var(--surface-card)',
                    border: `1px solid ${exercise.done ? 'rgba(0, 255, 194, 0.15)' : 'var(--glass-border)'}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Custom Checkbox */}
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      border: exercise.done ? 'none' : '2px solid var(--text-muted)',
                      background: exercise.done ? 'var(--gradient-accent)' : 'transparent',
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
                        <CheckCircle2 size={16} className="text-white" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Exercise Info */}
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
                      {exercise.sets}
                    </span>
                  </div>

                  {/* Done label */}
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

            {/* Finish Button — positioned for thumb access */}
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
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Trophy size={36} className="text-white" />
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
              className="btn-accent px-8 py-3 rounded-xl text-sm"
            >
              New Workout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
