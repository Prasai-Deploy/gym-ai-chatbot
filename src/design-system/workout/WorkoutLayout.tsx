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
  ] as QueueExercise[],
  onFinishWorkoutComplete = () => console.log('Workout finished'),
  onOpenCoach = () => console.log('Open Coach'),
  className,
}) => {
  const { activeSession, startSession, isStartingSession, logSet, isLoggingSet, completeSession } = useWorkoutData();

  // Active Database Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  // Sync active session from server if available
  useEffect(() => {
    if (activeSession?.id && !sessionId) {
      setSessionId(activeSession.id);
    }
  }, [activeSession?.id, sessionId]);

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

  const handleStartWorkout = useCallback(async () => {
    setPersistenceError(null);
    try {
      let currentId = sessionId || activeSession?.id;
      if (!currentId) {
        const sessionRes = await startSession({ title: routineTitle });
        currentId = sessionRes?.id;
        if (currentId) {
          setSessionId(currentId);
        }
      }
      setWorkflowState('active');
      setElapsedSec(0);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to start workout session on server';
      setPersistenceError(`Session Initialization Error: ${msg}`);
      // Still allow entering active view so user can retry upon set submission
      setWorkflowState('active');
      setElapsedSec(0);
    }
  }, [sessionId, activeSession?.id, startSession, routineTitle]);

  const handleCompleteSet = useCallback(async () => {
    setPersistenceError(null);

    // 1. In-flight guard: prevent duplicate submissions
    if (isLoggingSet) return;

    // 2. Resolve active session ID, starting one if needed
    let targetSessionId = sessionId || activeSession?.id;
    if (!targetSessionId) {
      try {
        const started = await startSession({ title: routineTitle });
        targetSessionId = started?.id;
        if (targetSessionId) {
          setSessionId(targetSessionId);
        }
      } catch (sessErr: any) {
        const msg = sessErr?.response?.data?.message || sessErr?.message || 'Unable to establish active workout session';
        setPersistenceError(`Session Error: ${msg}. Set was not saved.`);
        return; // STOP: do not advance UI
      }
    }

    if (!targetSessionId) {
      setPersistenceError('Active workout session required. Set was not saved to database.');
      return; // STOP: do not advance UI
    }

    // 3. Persist set to database
    try {
      const isUuid = currentExercise.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentExercise.id);
      const exerciseIdToLog = isUuid ? currentExercise.id : undefined;

      await logSet({
        sessionId: targetSessionId,
        exercise_id: exerciseIdToLog,
        weight_kg: currentWeightKg,
        reps: currentReps,
        rpe: 8,
      });

      // 4. Advance UI strictly on confirmed server persistence
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
          // Last exercise completed -> finish workout and mark completed on server
          if (targetSessionId) {
            try {
              await completeSession({ sessionId: targetSessionId });
            } catch (compErr) {
              console.warn('[WorkoutLayout] completeSession server error:', compErr);
            }
          }
          setWorkflowState('complete');
        }
      }
    } catch (err: any) {
      // 5. On persistence failure: do not advance UI, keep set retryable
      const msg = err?.response?.data?.message || err?.message || 'Database error: Failed to save exercise set';
      setPersistenceError(`Failed to save set: ${msg}. Please retry.`);
    }
  }, [
    isLoggingSet,
    sessionId,
    activeSession?.id,
    startSession,
    routineTitle,
    logSet,
    currentExercise.id,
    currentExercise.targetSets,
    currentWeightKg,
    currentReps,
    currentSetNumber,
    activeExIdx,
    exercises.length,
    completeSession
  ]);

  const handlePrevExercise = useCallback(() => {
    if (activeExIdx > 0) {
      setActiveExIdx((prev) => prev - 1);
      setCurrentSetNumber(1);
      setPersistenceError(null);
    }
  }, [activeExIdx]);

  const handleNextExercise = useCallback(() => {
    if (activeExIdx < exercises.length - 1) {
      setActiveExIdx((prev) => prev + 1);
      setCurrentSetNumber(1);
      setPersistenceError(null);
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
          isSavingSet={isLoggingSet || isStartingSession}
          persistenceError={persistenceError}
          onWeightChange={setCurrentWeightKg}
          onRepsChange={setCurrentReps}
          onCompleteSet={handleCompleteSet}
          onPrevExercise={handlePrevExercise}
          onNextExercise={handleNextExercise}
          onFinishWorkout={() => {
            if (sessionId) {
              completeSession({ sessionId }).catch((e) => console.warn(e));
            }
            setWorkflowState('complete');
          }}
          onAskTrinetra={onOpenCoach}
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
          durationSeconds={elapsedSec || 1800}
          totalExercises={exercises.length}
          totalVolumeKg={undefined}
          caloriesBurned={undefined}
          onDone={onFinishWorkoutComplete}
          onViewProgress={() => onFinishWorkoutComplete()}
        />
      )}
    </div>
  );
});

WorkoutLayout.displayName = 'WorkoutLayout';
