export interface ProfileCreatedEvent {
  eventType: 'Identity.ProfileCreated';
  payload: {
    userId: string;
    email: string;
    timestamp: string;
  };
}

export interface ProfileUpdatedEvent {
  eventType: 'Identity.ProfileUpdated';
  payload: {
    userId: string;
    timestamp: string;
  };
}

export interface FitnessProfileUpdatedEvent {
  eventType: 'Identity.FitnessProfileUpdated';
  payload: {
    userId: string;
    level: string;
    timestamp: string;
  };
}

export interface PreferencesUpdatedEvent {
  eventType: 'Identity.PreferencesUpdated';
  payload: {
    userId: string;
    timestamp: string;
  };
}

// Union Type for Identity Events
export type IdentityDomainEvent =
  | ProfileCreatedEvent
  | ProfileUpdatedEvent
  | FitnessProfileUpdatedEvent
  | PreferencesUpdatedEvent;
