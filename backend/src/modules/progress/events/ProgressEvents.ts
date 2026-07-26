export interface ProgressUpdatedEvent {
  eventType: 'Progress.Updated';
  payload: {
    userId: string;
    workoutCount: number;
    lifetimeVolume: number;
    timestamp: string;
  };
}

export interface AchievementUnlockedEvent {
  eventType: 'Achievement.Unlocked';
  payload: {
    userId: string;
    achievementId: string;
    key: string;
    timestamp: string;
  };
}
