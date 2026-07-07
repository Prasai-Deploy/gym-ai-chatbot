import { NutritionService } from './NutritionService';
import { RecoveryService } from './RecoveryService';
import { MemoryService } from './MemoryService';
import { UnifiedAIContextDTO } from '../domain/IntelligenceSchemas';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

// In a real application, these would be injected from other domains.
// For the sake of this vertical slice, we stub the external domain calls.
interface IExternalProgressService {
  getStats(userId: string): Promise<any>;
}
interface IExternalIdentityService {
  getProfile(userId: string): Promise<any>;
}

export class ContextBuilderService {
  constructor(
    private readonly nutrition: NutritionService,
    private readonly recovery: RecoveryService,
    private readonly memory: MemoryService,
    private readonly extProgress: IExternalProgressService,
    private readonly extIdentity: IExternalIdentityService
  ) {}

  public async buildUnifiedContext(userId: string): Promise<Result<UnifiedAIContextDTO, AppError>> {
    try {
      // Gather all domain contexts concurrently
      const [
        nutRes,
        recRes,
        memRes,
        progStats,
        identity
      ] = await Promise.all([
        this.nutrition.getNutritionContext(userId),
        this.recovery.getRecoveryContext(userId),
        this.memory.getMemoryContext(userId),
        this.extProgress.getStats(userId),
        this.extIdentity.getProfile(userId)
      ]);

      if (nutRes.isFailure()) throw nutRes.error;
      if (recRes.isFailure()) throw recRes.error;
      if (memRes.isFailure()) throw memRes.error;

      const context: UnifiedAIContextDTO = {
        timestamp: new Date().toISOString(),
        identity: {
          memberId: userId,
          name: identity?.name || 'Unknown',
          isPremium: true
        },
        workout: {
          recentSessions: [], // Stubbed
        },
        progress: {
          workoutCount: progStats?.workout_count || 0,
          currentStreak: progStats?.current_streak || 0,
          lifetimeVolumeKg: progStats?.lifetime_volume_kg || 0,
          recentAchievements: [] // Stubbed
        },
        nutrition: nutRes.value,
        recovery: recRes.value,
        memory: memRes.value
      };

      return ok(context);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
