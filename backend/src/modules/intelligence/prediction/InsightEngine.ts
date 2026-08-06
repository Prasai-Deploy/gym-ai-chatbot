import { HealthMetrics, AIInsight } from './prediction.types';
import { HealthScore } from './prediction.types';
import { WorkoutPrediction } from './prediction.types';
import { RecoveryPrediction } from './prediction.types';

export class InsightEngine {
  private insightId(): string {
    return `insight-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  public generateFeed(
    userId: string,
    metrics: HealthMetrics,
    healthScore: HealthScore,
    workout: WorkoutPrediction,
    recovery: RecoveryPrediction
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    // ─── Recovery Alerts ────────────────────────────────────────
    if (workout.injuryRisk > 0.6) {
      insights.push({
        id: this.insightId(), userId,
        category: 'risk', severity: 'alert',
        title: '⚠️ Elevated Injury Risk Detected',
        summary: `Your training load relative to recovery is too high. Risk score: ${Math.round(workout.injuryRisk * 100)}%.`,
        reasoning: `Recovery score (${recovery.predictedRecoveryScore}) and HRV (${metrics.hrvMs}ms) suggest insufficient adaptation. Continuing at this intensity risks acute or overuse injury.`,
        actionItems: ['Reduce session volume by 30%', 'Prioritize sleep (aim for 8h+)', 'Consider a deload week'],
        confidence: workout.confidence, createdAt: new Date().toISOString(),
      });
    }

    // ─── Plateau Warning ─────────────────────────────────────────
    if (workout.plateauRisk > 0.5) {
      insights.push({
        id: this.insightId(), userId,
        category: 'workout', severity: 'warning',
        title: '📊 Training Plateau Risk Detected',
        summary: 'Your training has been consistent but lacks progressive overload signals.',
        reasoning: `After ${metrics.streakDays} consecutive days with similar volume (${metrics.weeklyVolumeTons} tons/week), adaptation stimulus is declining.`,
        actionItems: ['Introduce a new training variable (RPE, tempo, rest time)', 'Add 5% load to compound lifts', 'Try a periodization shift (e.g. hypertrophy → strength block)'],
        confidence: 0.74, createdAt: new Date().toISOString(),
      });
    }

    // ─── Health Score Achievement ─────────────────────────────────
    if (healthScore.overallScore >= 85) {
      insights.push({
        id: this.insightId(), userId,
        category: 'goal', severity: 'achievement',
        title: `🏆 Health Score Grade ${healthScore.grade} — Outstanding`,
        summary: `Your STRIVA Health Score is ${healthScore.overallScore}/100. You are in the top performance tier.`,
        reasoning: `Fitness (${healthScore.fitnessScore}), Recovery (${healthScore.recoveryScore}), and Nutrition (${healthScore.nutritionScore}) are all trending positively.`,
        actionItems: ['Maintain current consistency', 'Consider progressive goal elevation', 'Log this milestone for long-term tracking'],
        confidence: 0.92, createdAt: new Date().toISOString(),
      });
    }

    // ─── Sleep Deficit ─────────────────────────────────────────────
    if ((metrics.sleepHours || 8) < 6.5) {
      insights.push({
        id: this.insightId(), userId,
        category: 'recovery', severity: 'warning',
        title: '😴 Sleep Deficit Impacting Performance',
        summary: `You averaged ${metrics.sleepHours}h of sleep. Science shows <7h reduces strength output by up to 20%.`,
        reasoning: 'Insufficient sleep reduces testosterone, elevates cortisol, impairs protein synthesis, and degrades cognitive focus during training.',
        actionItems: ['Set a consistent sleep schedule', 'Avoid screens 90 min before bed', 'Consider magnesium glycinate supplement'],
        confidence: 0.88, createdAt: new Date().toISOString(),
      });
    }

    // ─── Peak Readiness ────────────────────────────────────────────
    if (recovery.readinessLabel === 'peak') {
      insights.push({
        id: this.insightId(), userId,
        category: 'workout', severity: 'info',
        title: '🚀 Peak Readiness — Today is Your PR Day',
        summary: `Recovery score is ${recovery.predictedRecoveryScore}/100. HRV is elevated. This is an optimal performance window.`,
        reasoning: 'All recovery and readiness indicators are aligned. Training at high intensity today will maximize adaptation stimulus.',
        actionItems: ['Schedule a max-effort session today', 'Attempt a new personal record on your main lift', 'Log this data for future periodization planning'],
        confidence: 0.87, createdAt: new Date().toISOString(),
      });
    }

    return insights;
  }
}

export const insightEngine = new InsightEngine();
