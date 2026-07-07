import { WorkoutState } from '../domain/WorkoutSchemas';

export interface WorkoutStateTransitionEvent {
  eventType: 'Workout.StateTransitioned';
  payload: {
    workoutSessionId: string;
    userId: string;
    previousState: WorkoutState;
    newState: WorkoutState;
    timestamp: string;
  };
}

export interface SetCompletedEvent {
  eventType: 'Workout.SetCompleted';
  payload: {
    setId: string;
    exerciseSessionId: string;
    workoutSessionId: string;
    userId: string;
    timestamp: string;
  };
}

export interface ProgramPublishedEvent {
  eventType: 'Program.Published';
  payload: {
    programId: string;
    versionId: string;
    timestamp: string;
  };
}

export type WorkoutDomainEvent =
  | WorkoutStateTransitionEvent
  | SetCompletedEvent
  | ProgramPublishedEvent;
