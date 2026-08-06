import { HealthMetrics, RecoveryPrediction } from './prediction.types';

export class RecoveryPredictionEngine {
  public predict(metrics: HealthMetrics): RecoveryPrediction {
    const predictedScore = this.calcPredictedScore(metrics);
    const readiness      = this.toReadinessLabel(predictedScore);
    const fatigue        = this.calcFatigue(metrics);
    const sleepNeed      = this.calcSleepNeed(metrics, fatigue);
    const recommendations = this.buildRecommendations(metrics, predictedScore, fatigue);

    return {
      userId: metrics.userId,
      predictedRecoveryScore: predictedScore,
      readinessLabel: readiness,
      estimatedSleepNeedHours: sleepNeed,
      fatigueLevel: fatigue,
      recommendations,
      confidence: 0.75,
    };
  }

  private calcPredictedScore(m: HealthMetrics): number {
    let score = 70;
    // HRV is the strongest predictor
    const hrv = m.hrvMs || 45;
    score += ((hrv - 45) / 45) * 20;
    // Sleep quality impact
    const sleep = m.sleepHours || 7;
    score += (sleep - 7) * 4;
    // Stress penalty
    score -= (m.stressLevel || 0) * 2;
    // Recent training volume penalty
    score -= Math.min(15, (m.weeklyVolumeTons || 0) - 8);
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private toReadinessLabel(score: number): RecoveryPrediction['readinessLabel'] {
    if (score >= 85) return 'peak';
    if (score >= 65) return 'ready';
    if (score >= 45) return 'light_training';
    return 'not_ready';
  }

  private calcFatigue(m: HealthMetrics): number {
    const base = Math.max(0, 10 - (m.sleepHours || 7));
    const training = Math.min(5, (m.weeklyVolumeTons || 0) / 4);
    const stress = (m.stressLevel || 0) * 0.4;
    return Math.min(10, Math.round((base + training + stress) * 10) / 10);
  }

  private calcSleepNeed(m: HealthMetrics, fatigue: number): number {
    const base = 7.5;
    return Math.min(10, Math.max(7, base + fatigue * 0.15));
  }

  private buildRecommendations(m: HealthMetrics, score: number, fatigue: number): string[] {
    const recs: string[] = [];
    if ((m.sleepHours || 8) < 7) recs.push('Prioritize 7–9 hours of sleep tonight for optimal recovery.');
    if ((m.hrvMs || 50) < 35) recs.push('HRV is low — consider a light active recovery session or rest day.');
    if (fatigue > 7) recs.push('High fatigue detected. Reduce training volume by 30% this session.');
    if ((m.stressLevel || 0) > 7) recs.push('Cortisol indicators are elevated. Try 10 minutes of breathwork.');
    if (score >= 85) recs.push('Peak readiness — ideal day for a PR attempt or high-intensity session.');
    if (recs.length === 0) recs.push('Recovery looks solid. Proceed with your planned training session.');
    return recs;
  }
}

export const recoveryPredictionEngine = new RecoveryPredictionEngine();
