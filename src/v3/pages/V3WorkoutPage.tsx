import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pageVariants, springs } from '../theme/animations';
import { Play, Check, Clock, Trophy, ArrowRight, ArrowLeft, RotateCcw, Volume2 } from 'lucide-react';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  completed: boolean;
}

export const V3WorkoutPage: React.FC = () => {
  const navigate = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '85 kg', completed: false },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '32 kg', completed: false },
    { name: 'Lat Pulldown', sets: 4, reps: '10-12', weight: '70 kg', completed: false },
    { name: 'Seated Cable Row', sets: 3, reps: '12', weight: '65 kg', completed: false },
    { name: 'Overhead Press', sets: 3, reps: '8-10', weight: '55 kg', completed: false },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  
  // Rest Timer State
  const [restTime, setRestTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main Session Elapsed Timer
  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isFinished]);

  // Fullscreen Rest Countdown Timer
  useEffect(() => {
    if (restTime !== null && restTime > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTime(prev => (prev !== null && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [restTime]);

  const currentExercise = exercises[currentIndex];
  const completedCount = exercises.filter(e => e.completed).length;
  const progressPct = Math.round((completedCount / exercises.length) * 100);

  const handleStartWorkout = () => {
    setIsActive(true);
    setIsFinished(false);
    setElapsed(0);
  };

  const handleCompleteCurrentExercise = () => {
    const updated = [...exercises];
    updated[currentIndex].completed = true;
    setExercises(updated);

    // Trigger 60s Rest Timer Overlay
    setRestTime(60);

    // Advance to next exercise if available
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      setIsActive(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
        {/* Session Progress Top Bar */}
        <div className="flex items-center justify-between p-4 bg-[#131722] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F97316]" />
            <span className="text-xl font-mono font-extrabold text-white">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">
              Exercise {currentIndex + 1} of {exercises.length}
            </span>
            <div className="w-24 h-2 bg-[#1A2030] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#F97316] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {!isActive && !isFinished && (
          <Card variant="hero" className="text-center py-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400 v3-glow-orange">
              <Play className="w-8 h-8 fill-orange-400 ml-1" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#F97316]">STRIVA WORKOUT ENGINE</span>
              <h1 className="text-3xl font-extrabold text-white font-display">Upper Body Hypertrophy</h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">5 Exercises • Target 45 min • High Intensity Strain</p>
            </div>
            <Button variant="primary" size="lg" onClick={handleStartWorkout} className="px-10">
              START WORKOUT NOW
            </Button>
          </Card>
        )}

        {/* SINGLE EXERCISE FOCUS VIEW (Only ONE exercise visible at a time) */}
        {isActive && !isFinished && currentExercise && (
          <motion.div
            key={currentExercise.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springs.responsive}
            className="space-y-6"
          >
            <Card variant="workout" className="space-y-8 p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-[#F97316]">
                  CURRENT EXERCISE FOCUS
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {currentExercise.sets} Sets × {currentExercise.reps} Reps
                </span>
              </div>

              {/* Large Exercise Title */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
                  {currentExercise.name}
                </h1>
                <p className="text-sm text-slate-400">Focus on explosive concentric drive and controlled 2-second eccentric lowering.</p>
              </div>

              {/* Large Target Weight Gauge */}
              <div className="p-6 rounded-3xl bg-[#1A2030] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">TARGET WORKING WEIGHT</span>
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-display tabular-nums">
                    {currentExercise.weight}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">TARGET REPS</span>
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#F97316] font-display tabular-nums">
                    {currentExercise.reps}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Check className="w-5 h-5" />}
                  onClick={handleCompleteCurrentExercise}
                  className="flex-1"
                >
                  COMPLETE EXERCISE & REST
                </Button>
              </div>
            </Card>

            {/* Exercise Navigation Controls */}
            <div className="flex items-center justify-between px-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4" /> Previous Exercise
              </button>

              <button
                disabled={currentIndex === exercises.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30"
              >
                Next Exercise <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* WORKOUT COMPLETION CELEBRATION */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-6"
          >
            <div className="w-24 h-24 rounded-full bg-[#F97316] text-white flex items-center justify-center mx-auto shadow-2xl v3-glow-orange">
              <Trophy className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display">Session Mastered! 🏆</h1>
              <p className="text-sm text-slate-400">Completed all 5 exercises in {formatTime(elapsed)}</p>
            </div>
            <Button variant="primary" size="lg" onClick={() => navigate('/v3/dashboard')}>
              RETURN TO DASHBOARD
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* FULLSCREEN REST TIMER OVERLAY */}
      <AnimatePresence>
        {restTime !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-[#090B10]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <span className="text-xs font-black uppercase tracking-widest text-[#F97316]">REST PERIOD ACTIVE</span>
            
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="85" fill="none" stroke="#1A2030" strokeWidth="12" />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 85}
                  strokeDashoffset={2 * Math.PI * 85 * (1 - restTime / 60)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-6xl font-extrabold text-white font-display tabular-nums">{restTime}s</span>
                <span className="text-xs text-slate-400 font-bold uppercase mt-1">Deep Breathing</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" onClick={() => setRestTime(prev => (prev || 0) + 30)}>
                +30s Rest
              </Button>
              <Button variant="primary" size="md" onClick={() => setRestTime(null)}>
                Skip Rest & Continue
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileDock />
    </div>
  );
};
