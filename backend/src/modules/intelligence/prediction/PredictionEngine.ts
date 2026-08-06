import { HealthMetrics } from './prediction.types';
import { healthScoreEngine } from './HealthScoreEngine';
import { workoutPredictionEngine } from './WorkoutPredictionEngine';
import { nutritionPredictionEngine } from './NutritionPredictionEngine';
import { recoveryPredictionEngine } from './RecoveryPredictionEngine';
import { insightEngine } from './InsightEngine';
import { personalizationEngine } from './PersonalizationEngine';
import { scenarioPlanner } from './ScenarioPlanner';
import { goalForecastEngine, GoalInput } from './GoalForecastEngine';
import { businessForecastEngine, BusinessMetrics } from './BusinessForecastEngine';

export class PredictionEngine {
  /**
   * Unified intelligence report for a single member.
   * Chains all sub-engines and generates a full prediction bundle.
   */
  public async generateMemberReport(metrics: HealthMetrics, goals?: GoalInput[]) {
    const healthScore  = healthScoreEngine.calculate(metrics);
    const workout      = workoutPredictionEngine.predict(metrics);
    const nutrition    = nutritionPredictionEngine.predict(metrics);
    const recovery     = recoveryPredictionEngine.predict(metrics);
    const insights     = insightEngine.generateFeed(metrics.userId, metrics, healthScore, workout, recovery);
    const profile      = personalizationEngine.buildProfile(metrics.userId, metrics);
    const personalized = personalizationEngine.recommend(metrics, profile);
    const goalForecasts = goals?.map((g) => goalForecastEngine.forecast(g)) || [];

    return {
      userId: metrics.userId,
      generatedAt: new Date().toISOString(),
      healthScore,
      workout,
      nutrition,
      recovery,
      personalized,
      insights,
      goalForecasts,
    };
  }

  public async generateBusinessReport(bizMetrics: BusinessMetrics) {
    const base = businessForecastEngine.forecast(bizMetrics, 'monthly');
    const quarterly = businessForecastEngine.forecast(bizMetrics, 'quarterly');
    const annual = businessForecastEngine.forecast(bizMetrics, 'annual');
    const scenarios = businessForecastEngine.generateScenarios(bizMetrics);

    return {
      organizationId: bizMetrics.organizationId,
      generatedAt: new Date().toISOString(),
      monthly: base,
      quarterly,
      annual,
      scenarios,
    };
  }

  public runScenario(metrics: HealthMetrics, scenarios: Array<{ name: string; changes: Partial<HealthMetrics> }>) {
    return scenarioPlanner.simulate(metrics, scenarios);
  }
}

export const predictionEngine = new PredictionEngine();
