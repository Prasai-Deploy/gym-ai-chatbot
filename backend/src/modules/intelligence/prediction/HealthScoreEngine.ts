import { HealthMetrics, HealthScore } from './prediction.types';

export class HealthScoreEngine {
  /**
   * Calculates a composite STRIVA Health Score (0–100) from weighted sub-scores.
   * Weights: Fitness 35%, Recovery 30%, Nutrition 20%, Body Composition 15%
   */
  public calculate(metrics: HealthMetrics): HealthScore {
    const fitnessScore    = this.calcFitnessScore(metrics);
    const recoveryScore   = this.calcRecoveryScore(metrics);
    const nutritionScore  = this.calcNutritionScore(metrics);
    const bodyScore       = this.calcBodyCompositionScore(metrics);

    const overall = Math.round(
      fitnessScore   * 0.35 +
      recoveryScore  * 0.30 +
      nutritionScore * 0.20 +
      bodyScore      * 0.15
    );

    return {
      userId: metrics.userId,
      overallScore: Math.min(100, Math.max(0, overall)),
      fitnessScore,
      recoveryScore,
      nutritionScore,
      bodyCompositionScore: bodyScore,
      grade: this.scoreToGrade(overall),
      trend: 'stable', // Calculated from historical deltas in production
      breakdown: { fitnessScore, recoveryScore, nutritionScore, bodyCompositionScore: bodyScore },
      calculatedAt: new Date().toISOString(),
    };
  }

  private calcFitnessScore(m: HealthMetrics): number {
    let score = 50;
    // Consistency (streak + weekly workouts)
    score += Math.min(20, (m.streakDays || 0) * 0.8);
    score += Math.min(15, (m.weeklyWorkouts || 0) * 3);
    // Volume
    score += Math.min(10, (m.weeklyVolumeTons || 0) * 0.5);
    // VO2 Max bonus
    if ((m.vo2Max || 0) > 45) score += 5;
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calcRecoveryScore(m: HealthMetrics): number {
    let score = 40;
    // HRV contribution (≥50ms = excellent)
    score += Math.min(25, ((m.hrvMs || 0) / 80) * 25);
    // Sleep (target 7.5h)
    const sleepRatio = Math.min(1, (m.sleepHours || 0) / 7.5);
    score += Math.round(sleepRatio * 25);
    // Recovery score from wearable
    score += Math.min(10, ((m.recoveryScore || 0) / 100) * 10);
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calcNutritionScore(m: HealthMetrics): number {
    let score = 50;
    // Calorie deficit/surplus management
    const deficit = m.calorieDeficit || 0;
    if (deficit >= -200 && deficit <= 500) score += 30; // In healthy range
    else if (Math.abs(deficit) < 800) score += 15;
    // Hydration (target 2500ml)
    const hydration = m.hydrationMl || 0;
    if (hydration >= 2500) score += 20;
    else score += Math.round((hydration / 2500) * 20);
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calcBodyCompositionScore(m: HealthMetrics): number {
    let score = 60;
    const bodyFat = m.bodyFatPct || 20;
    // Fitness-level body fat benchmarks (simplified)
    if (bodyFat < 12) score += 40;
    else if (bodyFat < 18) score += 30;
    else if (bodyFat < 25) score += 15;
    else score -= 10;
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private scoreToGrade(score: number): HealthScore['grade'] {
    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}

export const healthScoreEngine = new HealthScoreEngine();
