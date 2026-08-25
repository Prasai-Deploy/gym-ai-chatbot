import React, { useState, useEffect } from 'react';
import { WorkoutHeader } from './WorkoutHeader';
import { WorkoutProgress } from './WorkoutProgress';
import { ExerciseFocusCard } from './ExerciseFocusCard';
import { RestTimerOverlay } from './RestTimerOverlay';
import { WorkoutSidebar } from './WorkoutSidebar';
import { WorkoutStats } from './WorkoutStats';
import { WorkoutControls } from './WorkoutControls';
import { CelebrationModal } from './CelebrationModal';
import { WorkoutSummary } from './WorkoutSummary';
import { SetData } from './SetRow';
import { QueueExercise } from './ExerciseQueue';
import { PageContainer } from '../shell/PageContainer';
import { IconButton } from '../components/IconButton';
import { Menu } from '../icons';

export interface WorkoutLayoutProps {
  routineTitle?: string;
  category?: string;
  exercises?: QueueExercise[];
  onFinishWorkoutComplete?: () => void;
  className?: string;
}

export const WorkoutLayout: React.FC<WorkoutLayoutProps> = React.memo(({
  routineTitle = 'Hypertrophy Chest & Triceps Blast',
  category = 'Hypertrophy • Push Cycle',
  exercises = [
    { id: 'ex-1', name: 'Incline Barbell Bench Press', muscleGroup: 'Upper Chest', targetSets: 4, completedSets: 2, status: 'active' },
    { id: 'ex-2', name: 'Flat Dumbbell Flyes', muscleGroup: 'Chest Outer', targetSets: 3, completedSets: 0, status: 'upcoming' },
    { id: 'ex-3', name: 'Cable Tricep Pushdowns', muscleGroup: 'Triceps Lateral', targetSets: 4, completedSets: 0, status: 'upcoming' },
    { id: 'ex-4', name: 'Skull Crushers', muscleGroup: 'Triceps Long Head', targetSets: 3, completedSets: 0, status: 'upcoming' },
  ],
  onFinishWorkoutComplete = () => console.log('Workout finished'),
  className,
}) => {
  const [activeExIdx, setActiveExIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(1240);
  const [isPaused, setIsPaused] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRestOpen, setIsRestOpen] = useState(false);
  const [restSec, setRestSec] = useState(90);

  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isSummaryView, setIsSummaryView] = useState(false);

  // Sets state for current exercise
  const [sets, setSets] = useState<SetData[]>([
    { id: 's1', setNumber: 1, previousBest: '80kg × 10', weightKg: 82.5, reps: 10, completed: true },
    { id: 's2', setNumber: 2, previousBest: '80kg × 10', weightKg: 82.5, reps: 8, completed: true },
    { id: 's3', setNumber: 3, previousBest: '80kg × 8', weightKg: 82.5, reps: 8, completed: false },
    { id: 's4', setNumber: 4, previousBest: '80kg × 8', weightKg: 80, reps: 10, completed: false },
  ]);

  // Live timer tick
  useEffect(() => {
    if (isPaused || isSummaryView) return;
    const timer = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isPaused, isSummaryView]);

  // Rest timer tick
  useEffect(() => {
    if (!isRestOpen) return;
    const timer = setInterval(() => {
      setRestSec((prev) => {
        if (prev <= 1) {
          setIsRestOpen(false);
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestOpen]);

  const currentExercise = exercises[activeExIdx] || exercises[0];

  const handleUpdateSet = (setId: string, field: 'weightKg' | 'reps', value: string) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s))
    );
  };

  const handleToggleCompleteSet = (setId: string) => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.id === setId) {
          const nextCompleted = !s.completed;
          if (nextCompleted) {
            setRestSec(90);
            setIsRestOpen(true);
          }
          return { ...s, completed: nextCompleted };
        }
        return s;
      })
    );
  };

  const handleAddSet = () => {
    const nextNum = sets.length + 1;
    const lastSet = sets[sets.length - 1];
    setSets((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}`,
        setNumber: nextNum,
        previousBest: lastSet ? `${lastSet.weightKg}kg × ${lastSet.reps}` : '—',
        weightKg: lastSet ? lastSet.weightKg : 80,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      },
    ]);
  };

  const handleFinish = () => {
    setIsCelebrationOpen(true);
  };

  if (isSummaryView) {
    return (
      <PageContainer maxWidth="lg" className="py-6">
        <WorkoutSummary
          routineTitle={routineTitle}
          totalVolumeKg={12450}
          caloriesBurned={520}
          durationMin={Math.floor(elapsedSec / 60)}
          prsHit={2}
          onDone={onFinishWorkoutComplete}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg" className={`flex flex-col gap-6 ${className}`}>
      {/* Top Controls Bar */}
      <WorkoutHeader
        title={routineTitle}
        category={category}
        elapsedSeconds={elapsedSec}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onEndWorkout={handleFinish}
      />

      {/* Progress & Sidebar Trigger */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <WorkoutProgress
            currentExerciseIndex={activeExIdx}
            totalExercises={exercises.length}
            completedSetsCount={sets.filter((s) => s.completed).length}
            totalSetsCount={sets.length * exercises.length}
          />
        </div>
        <IconButton
          icon={<Menu className="w-4 h-4 text-brand-400" />}
          aria-label="Toggle exercise queue sidebar"
          size="lg"
          variant="secondary"
          onClick={() => setIsSidebarOpen(true)}
        />
      </div>

      {/* Active Exercise Focus Card */}
      <ExerciseFocusCard
        exerciseName={currentExercise.name}
        muscleGroup={currentExercise.muscleGroup}
        equipment="Barbell Bench Press"
        sets={sets}
        onUpdateSet={handleUpdateSet}
        onToggleCompleteSet={handleToggleCompleteSet}
        onAddSet={handleAddSet}
      />

      {/* Live Stats */}
      <WorkoutStats totalVolumeKg={12450} caloriesBurned={520} setsLogged={sets.filter((s) => s.completed).length} />

      {/* Bottom Exercise Controls */}
      <WorkoutControls
        hasPrev={activeExIdx > 0}
        hasNext={activeExIdx < exercises.length - 1}
        onPrevExercise={() => setActiveExIdx((prev) => Math.max(prev - 1, 0))}
        onNextExercise={() => setActiveExIdx((prev) => Math.min(prev + 1, exercises.length - 1))}
        onStartRestTimer={() => {
          setRestSec(90);
          setIsRestOpen(true);
        }}
        onFinishWorkout={handleFinish}
      />

      {/* Rest Timer Fullscreen Overlay */}
      <RestTimerOverlay
        isOpen={isRestOpen}
        secondsRemaining={restSec}
        totalRestSeconds={90}
        onAddThirtySec={() => setRestSec((prev) => prev + 30)}
        onSkipRest={() => setIsRestOpen(false)}
      />

      {/* Queue Sidebar Drawer */}
      <WorkoutSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        exercises={exercises}
        activeExerciseId={currentExercise.id}
        onSelectExercise={(id) => {
          const idx = exercises.findIndex((e) => e.id === id);
          if (idx !== -1) setActiveExIdx(idx);
        }}
      />

      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        onViewSummary={() => {
          setIsCelebrationOpen(false);
          setIsSummaryView(true);
        }}
        totalVolumeKg={12450}
        caloriesBurned={520}
        durationMin={Math.floor(elapsedSec / 60)}
      />
    </PageContainer>
  );
});

WorkoutLayout.displayName = 'WorkoutLayout';
