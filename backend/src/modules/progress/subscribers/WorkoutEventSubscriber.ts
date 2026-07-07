import { eventBus } from '@shared/core/EventBus';
import { ProgressAnalyticsService } from '../services/ProgressAnalyticsService';
import { AchievementService } from '../services/AchievementService';
import { logger } from '@logger/index';

export class WorkoutEventSubscriber {
  constructor(
    private readonly analyticsService: ProgressAnalyticsService,
    private readonly achievementService: AchievementService
  ) {}

  public subscribe(): void {
    // Listen to Workout.COMPLETED
    eventBus.subscribe('Workout.COMPLETED', async (payload: any) => {
      logger.info({ payload }, '[WorkoutEventSubscriber] Processing Workout.COMPLETED');
      try {
        // We know payload.userId is missing from the raw db trigger in the slice, 
        // but let's assume it was passed correctly by the execution service.
        // For safety, let's extract it:
        const userId = payload.userId;
        if (!userId) {
          logger.warn('Workout.COMPLETED event missing userId');
          return;
        }

        const statsRes = await this.analyticsService.incrementWorkoutCount(userId);
        if (statsRes.isSuccess()) {
          // Evaluate achievements based on new count
          const newCount = statsRes.value.workout_count;
          await this.achievementService.evaluateWorkoutCountAchievements(userId, newCount);
        }
      } catch (err) {
        logger.error(err, '[WorkoutEventSubscriber] Error handling Workout.COMPLETED');
      }
    });
  }
}
