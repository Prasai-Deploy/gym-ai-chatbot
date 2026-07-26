export interface ExerciseCreatedEvent {
  eventType: 'Exercise.Created';
  payload: {
    exerciseId: string;
    timestamp: string;
  };
}

export interface ExerciseUpdatedEvent {
  eventType: 'Exercise.Updated';
  payload: {
    exerciseId: string;
    timestamp: string;
  };
}

export interface ExerciseDeletedEvent {
  eventType: 'Exercise.Deleted';
  payload: {
    exerciseId: string;
    timestamp: string;
  };
}

export interface ExerciseVariationAddedEvent {
  eventType: 'Exercise.VariationAdded';
  payload: {
    baseExerciseId: string;
    variationExerciseId: string;
    timestamp: string;
  };
}

export interface ExerciseAlternativeLinkedEvent {
  eventType: 'Exercise.AlternativeLinked';
  payload: {
    exerciseId: string;
    alternativeId: string;
    timestamp: string;
  };
}

export type ExerciseDomainEvent =
  | ExerciseCreatedEvent
  | ExerciseUpdatedEvent
  | ExerciseDeletedEvent
  | ExerciseVariationAddedEvent
  | ExerciseAlternativeLinkedEvent;
