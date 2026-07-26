import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { UnifiedAIContextDTO } from '../domain/IntelligenceSchemas';
import { eventBus } from '@shared/core/EventBus';

export class RecommendationService {
  constructor() {}

  public async generateRecommendations(context: UnifiedAIContextDTO): Promise<Result<any[], AppError>> {
    const recommendations = [];

    // Rule 1: High Fatigue
    if (context.recovery.fatigueWarning) {
      recommendations.push({
        type: 'RECOVERY',
        message: 'Your readiness score is extremely low. Consider a rest day or light mobility work.'
      });
    }

    // Rule 2: Inconsistent Hydration (Stub rule)
    if (context.nutrition.hydrationTrend === 'Decreasing') {
      recommendations.push({
        type: 'NUTRITION',
        message: 'Your hydration has been decreasing. Aim for 3 liters of water today.'
      });
    }

    // Rule 3: Great consistency
    if (context.progress.currentStreak >= 5) {
      recommendations.push({
        type: 'WORKOUT',
        message: 'You are on a 5+ day streak! Keep the momentum going.'
      });
    }

    if (recommendations.length > 0) {
      eventBus.publish('Recommendation.GENERATED', { userId: context.identity.memberId, count: recommendations.length });
    }

    return ok(recommendations);
  }
}
