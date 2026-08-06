import { GoalForecast } from './prediction.types';

export interface GoalInput {
  userId: string;
  goalType: string;
  currentValue: number;
  targetValue: number;
  weeklyDelta: number; // Historical weekly progress rate
}

export class GoalForecastEngine {
  /**
   * Forecasts goal achievement date using linear trend extrapolation.
   * Returns on-track status, required weekly delta, and confidence.
   */
  public forecast(input: GoalInput): GoalForecast {
    const remaining      = input.targetValue - input.currentValue;
    const isDecreasing   = remaining < 0; // e.g. weight loss
    const absRemaining   = Math.abs(remaining);
    const absWeeklyDelta = Math.abs(input.weeklyDelta);

    let weeksNeeded = absWeeklyDelta > 0 ? absRemaining / absWeeklyDelta : 52;
    weeksNeeded = Math.min(weeksNeeded, 52);

    const achievementDate = new Date();
    achievementDate.setDate(achievementDate.getDate() + Math.round(weeksNeeded * 7));

    // Required delta to hit goal in 12 weeks
    const requiredWeeklyDelta = Math.round((absRemaining / 12) * 10) / 10;

    const onTrack = absWeeklyDelta >= requiredWeeklyDelta * 0.85;

    return {
      userId: input.userId,
      goalType: input.goalType,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      predictedAchievementDate: achievementDate.toISOString().split('T')[0],
      onTrack,
      requiredWeeklyDelta,
      confidence: onTrack ? 0.80 : 0.55,
    };
  }
}

export const goalForecastEngine = new GoalForecastEngine();
