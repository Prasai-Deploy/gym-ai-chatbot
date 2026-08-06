import { HealthMetrics, WorkoutPrediction } from './prediction.types';

export class WorkoutPredictionEngine {
  /**
   * Predicts next workout readiness, recommended intensity, estimated 1RM,
   * and plateau/injury risk using training load and recovery metrics.
   */
  public predict(metrics: HealthMetrics): WorkoutPrediction {
    const injuryRisk   = this.calcInjuryRisk(metrics);
    const plateauRisk  = this.calcPlateauRisk(metrics);
    const intensity    = this.recommendIntensity(metrics, injuryRisk);
    const volumeTons   = this.predictVolume(metrics, intensity);
    const nextDate     = this.predictNextDate(metrics);

    return {
      userId: metrics.userId,
      predictedNextWorkoutDate: nextDate,
      recommendedIntensity: intensity,
      predictedVolumeTons: volumeTons,
      estimatedOneRepMax: this.estimateOneRepMax(metrics),
      plateauRisk,
      injuryRisk,
      confidence: 0.82,
    };
  }

  private calcInjuryRisk(m: HealthMetrics): number {
    let risk = 0;
    if ((m.weeklyWorkouts || 0) > 6) risk += 0.25;
    if ((m.recoveryScore || 100) < 50) risk += 0.35;
    if ((m.stressLevel || 0) > 7) risk += 0.20;
    if ((m.sleepHours || 8) < 6) risk += 0.20;
    return Math.min(1, risk);
  }

  private calcPlateauRisk(m: HealthMetrics): number {
    let risk = 0;
    if ((m.streakDays || 0) > 60) risk += 0.3; // Long unvaried training
    if ((m.weeklyVolumeTons || 0) < 3) risk += 0.2; // Low volume
    return Math.min(1, risk);
  }

  private recommendIntensity(m: HealthMetrics, injuryRisk: number): WorkoutPrediction['recommendedIntensity'] {
    const recovery = m.recoveryScore || 75;
    if (injuryRisk > 0.6 || recovery < 40) return 'easy';
    if (recovery < 60) return 'moderate';
    if (recovery >= 85 && injuryRisk < 0.2) return 'max_effort';
    return 'hard';
  }

  private predictVolume(m: HealthMetrics, intensity: string): number {
    const base = m.weeklyVolumeTons || 10;
    const multiplier = { easy: 0.6, moderate: 0.85, hard: 1.05, max_effort: 1.20 }[intensity] || 1;
    return Math.round(base * multiplier * 10) / 10;
  }

  private predictNextDate(m: HealthMetrics): string {
    const daysUntilNext = (m.recoveryScore || 75) > 70 ? 1 : 2;
    const next = new Date();
    next.setDate(next.getDate() + daysUntilNext);
    return next.toISOString().split('T')[0];
  }

  private estimateOneRepMax(m: HealthMetrics): Record<string, number> {
    // Simplified Epley formula approximation using volume proxy
    const baseStrength = (m.weeklyVolumeTons || 10) * 8;
    return {
      bench_press: Math.round(baseStrength * 0.7),
      squat: Math.round(baseStrength * 1.0),
      deadlift: Math.round(baseStrength * 1.2),
      overhead_press: Math.round(baseStrength * 0.45),
    };
  }
}

export const workoutPredictionEngine = new WorkoutPredictionEngine();
