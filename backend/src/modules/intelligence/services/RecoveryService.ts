import { RecoveryRepository } from '../repositories/RecoveryRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { LogRecoveryDTO, RecoveryContextDTO } from '../domain/IntelligenceSchemas';
import { eventBus } from '@shared/core/EventBus';

export class RecoveryService {
  constructor(private readonly repository: RecoveryRepository) {}

  public async logRecovery(userId: string, dto: LogRecoveryDTO): Promise<Result<any, AppError>> {
    // Calculate naive readiness score based on sleep and stress
    const sleep = dto.sleep_hours || 7;
    const stress = dto.stress_level || 5;
    const soreness = dto.soreness_level || 5;
    
    // Simple heuristic for the slice
    let readiness = 100 - (stress * 2) - (soreness * 3);
    if (sleep < 6) readiness -= 20;
    if (readiness < 0) readiness = 0;
    
    const result = await this.repository.logRecovery(userId, dto, readiness);
    if (result.isSuccess()) {
      eventBus.publish('Recovery.LOGGED', { userId, date: dto.date, readinessScore: readiness });
    }
    return result;
  }

  public async getRecoveryContext(userId: string): Promise<Result<RecoveryContextDTO, AppError>> {
    const logsRes = await this.repository.getRecentLogs(userId, 7);
    if (logsRes.isFailure()) return logsRes as Result<any, AppError>;
    
    const logs = logsRes.value;
    const latest = logs[0];
    
    let totalSleep = 0;
    logs.forEach(log => totalSleep += (log.sleep_hours || 0));
    const recentSleepAvg = logs.length > 0 ? (totalSleep / logs.length) : 0;
    
    return ok({
      currentReadinessScore: latest ? latest.readiness_score : 100,
      recentSleepAvg: recentSleepAvg,
      fatigueWarning: (latest && latest.readiness_score < 40) ? true : false
    });
  }
}
