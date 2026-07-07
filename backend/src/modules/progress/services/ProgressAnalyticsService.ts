import { ProgressRepository } from '../repositories/ProgressRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { ProgressStatistics } from '../domain/ProgressSchemas';
import { logger } from '@logger/index';

export class ProgressAnalyticsService {
  constructor(private readonly repository: ProgressRepository) {}

  public async getStatistics(userId: string): Promise<Result<ProgressStatistics | null, AppError>> {
    return this.repository.getStatsByUserId(userId);
  }

  public async incrementWorkoutCount(userId: string): Promise<Result<ProgressStatistics, AppError>> {
    const statsRes = await this.repository.getStatsByUserId(userId);
    if (statsRes.isFailure()) return statsRes as Result<any, AppError>;
    
    const stats = statsRes.value;
    const newCount = stats ? stats.workout_count + 1 : 1;
    // Calculate streak (simplified for this slice)
    const newStreak = stats ? stats.current_streak + 1 : 1;
    const longestStreak = stats ? Math.max(stats.longest_streak, newStreak) : 1;

    const updates: Partial<ProgressStatistics> = {
      workout_count: newCount,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_workout_date: new Date()
    };

    const updateRes = await this.repository.upsertStats(userId, updates);
    if (updateRes.isFailure()) return updateRes;
    
    logger.info({ userId, newCount }, 'Progress statistics incremented');
    return updateRes;
  }
}
