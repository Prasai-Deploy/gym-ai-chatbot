import React, { useState, useEffect, useCallback } from 'react';
import { MinimalWorkoutHero } from './MinimalWorkoutHero';
import { ActiveTrainingView } from './ActiveTrainingView';
import { MinimalRestTimer } from './MinimalRestTimer';
import { MinimalCompletionView } from './MinimalCompletionView';
import { QueueExercise } from './ExerciseQueue';
import { SetData } from './SetRow';
import { useWorkoutData } from '../../hooks/useStrivaApi';
import { cn } from '../tokens';

export interface WorkoutLayoutProps {
  routineTitle?: string;
  category?: string;
  exercises?: QueueExercise[];
  onFinishWorkoutComplete?: () => void;
  onOpenCoach?: () => void;
  className?: string;
}

export const WorkoutLayout: React.FC<WorkoutLayoutProps> = React.memo(({
  routineTitle = 'Upper Body Push & Core',
  category = 'Hypertrophy • Push Cycle',
  exercises = [
    { id: 'ex-1', name: 'Incline Barbell Bench Press', muscleGroup: 'Upper Chest', targetSets: 4, completedSets: 0, status: 'active' },
    { id: 'ex-2', name: 'Flat Dumbbell Flyes', muscleGroup: 'Chest Outer', targetSets: 3, completedSets: 0, status: 'upcoming' },
    { id: 'ex-3', name: 'Overhead Dumbbell Press', muscleGroup: 'Anterior Deltoids', targetSets: 4, completedSets: 0, status: 'upcoming' },
    { id: 'ex-4', name: 'Cable Tricep Pushdowns', muscleGroup: 'Triceps Lateral', targetSets: 4, completedSets: 0, status: 'upcoming' },
    { id: 'ex-5', name: 'Hanging Leg Raises', muscleGroup: 'Core & Abs', targetSets: 3, completedSets: 0, status: 'upcoming' },
  ],
  onFinishWorkoutComplete = () => console.log('Workout finished'),
  onOpenCoach = () => console.log('Open Coach'),
  className,
}) => {
  const { logSet } = useWorkoutData();

  // Workflow State: 'preview' | 'active' | 'rest' | 'complete'
  const [workflowState, setWorkflowState] = useState<'preview' | 'active' | 'rest' | 'complete'>('preview');

  const [activeExIdx, setActiveExIdx] = useState(0);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [currentWeightKg, setCurrentWeightKg] = useState(80);
  const [currentReps, setCurrentReps] = useState(8);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSec, setRestSec] = useState(90);

  // Live workout timer
  useEffect(() => {
    if (workflowState !== 'active' && workflowState !== 'rest') return;
    const timer = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [workflowState]);

  // Rest countdown timer
  useEffect(() => {
    if (workflowState !== 'rest') return;
    const timer = setInterval(() => {
      setRestSec((prev) => {
        if (prev <= 1) {
          setWorkflowState('active');
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [workflowState]);

  const currentExercise = exercises[activeExIdx] || exercises[0];

  const handleStartWorkout = useCallback(() => {
    setWorkflowState('active');
    setElapsedSec(0);
  }, []);

  const handleCompleteSet = useCallback(async () => {
    // Fire real API mutation asynchronously
    try {
      if (logSet) {
        await logSet({
          exerciseId: currentExercise.id || `ex-${activeExIdx + 1}`,
          weightKg: currentWeightKg,
          reps: currentReps,
          rpe: 8,
        });
      }
    } catch {
      // Graceful local progression
    }

    const totalSetsForEx = currentExercise.targetSets || 4;

    if (currentSetNumber < totalSetsForEx) {
      // Move to next set with rest
      setCurrentSetNumber((prev) => prev + 1);
      setRestSec(90);
      setWorkflowState('rest');
    } else {
      // Move to next exercise if available
      if (activeExIdx < exercises.length - 1) {
        setActiveExIdx((prev) => prev + 1);
        setCurrentSetNumber(1);
        setRestSec(90);
        setWorkflowState('rest');
      } else {
        // Last exercise completed -> finish workout
        setWorkflowState('complete');
      }
    }
  }, [logSet, currentExercise, activeExIdx, exercises.length, currentSetNumber, currentWeightKg, currentReps]);

  const handlePrevExercise = useCallback(() => {
    if (activeExIdx > 0) {
      setActiveExIdx((prev) => prev - 1);
      setCurrentSetNumber(1);
    }
  }, [activeExIdx]);

  const handleNextExercise = useCallback(() => {
    if (activeExIdx < exercises.length - 1) {
      setActiveExIdx((prev) => prev + 1);
      setCurrentSetNumber(1);
    }
  }, [activeExIdx, exercises.length]);

  return (
    <div className={cn('w-full min-h-[calc(100vh-140px)] flex flex-col justify-center px-4 py-4 sm:py-6', className)}>
      {workflowState === 'preview' && (
        <MinimalWorkoutHero
          routineTitle={routineTitle}
          category={category}
          durationMinutes={52}
          description="Today's training is focused on chest, shoulders and triceps."
          exercises={exercises}
          onStartWorkout={handleStartWorkout}
        />
      )}

      {workflowState === 'active' && (
        <ActiveTrainingView
          exerciseIndex={activeExIdx}
          totalExercises={exercises.length}
          exerciseName={currentExercise.name}
          muscleGroup={currentExercise.muscleGroup}
          currentSetNumber={currentSetNumber}
          totalSets={currentExercise.targetSets || 4}
          currentWeightKg={currentWeightKg}
          currentReps={currentReps}
          previousBest={`${currentWeightKg - 2.5} kg × 10`}
          targetRange="8–10 reps"
          onWeightChange={setCurrentWeightKg}
          onRepsChange={setCurrentReps}
          onCompleteSet={handleCompleteSet}
          onPrevExercise={handlePrevExercise}
          onNextExercise={handleNextExercise}
          onFinishWorkout={() => setWorkflowState('complete')}
          onAskTrinity={onOpenCoach}
          hasPrevExercise={activeExIdx > 0}
          hasNextExercise={activeExIdx < exercises.length - 1}
        />
      )}

      {workflowState === 'rest' && (
        <MinimalRestTimer
          secondsRemaining={restSec}
          totalRestSeconds={90}
          nextExerciseName={currentExercise.name}
          nextSetNumber={currentSetNumber}
          onSkipRest={() => setWorkflowState('active')}
          onAddThirtySeconds={() => setRestSec((prev) => prev + 30)}
        />
      )}

      {workflowState === 'complete' && (
        <MinimalCompletionView
          routineTitle={routineTitle}
          durationSeconds={elapsedSec || 3120}
          totalExercises={exercises.length}
          totalVolumeKg={4820}
          caloriesBurned={520}
          onDone={onFinishWorkoutComplete}
          onViewProgress={() => onFinishWorkoutComplete()}
        />
      )}
    </div>
  );
});

WorkoutLayout.displayName = 'WorkoutLayout';
