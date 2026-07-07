import { AchievementRepository } from '../repositories/AchievementRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { eventBus } from '@shared/core/EventBus';
import { logger } from '@logger/index';

export class AchievementService {
  constructor(private readonly repository: AchievementRepository) {}

  public async getUserAchievements(userId: string): Promise<Result<any[], AppError>> {
    return this.repository.getUserAchievements(userId);
  }

  public async evaluateWorkoutCountAchievements(userId: string, currentCount: number): Promise<void> {
    const evaluate = async (target: number, key: string) => {
      if (currentCount >= target) {
        const unlockRes = await this.repository.unlockAchievement(userId, key);
        if (unlockRes.isSuccess() && unlockRes.value === true) {
          logger.info({ userId, key }, 'Unlocked new achievement!');
          eventBus.publish('Achievement.Unlocked', {
            userId,
            achievementKey: key,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    await evaluate(1, 'FIRST_WORKOUT');
    await evaluate(10, 'TEN_WORKOUTS');
    await evaluate(100, 'CENTURY_CLUB');
  }
}
