import { HealthMetrics, ScenarioResult } from './prediction.types';

export class ScenarioPlanner {
  /**
   * Simulates "what-if" scenarios for a given member's health trajectory.
   * Returns probability-weighted outcomes for three user-defined variable changes.
   */
  public simulate(
    baseMetrics: HealthMetrics,
    scenarios: Array<{ name: string; changes: Partial<HealthMetrics> }>
  ): ScenarioResult[] {
    return scenarios.map((scenario) => {
      const modified: HealthMetrics = { ...baseMetrics, ...scenario.changes };
      const outcome = this.projectOutcome(baseMetrics, modified);

      return {
        scenarioName: scenario.name,
        assumptions: scenario.changes,
        projectedOutcome: outcome,
        probability: outcome.probability,
        riskLevel: outcome.probability > 0.7 ? 'low' : outcome.probability > 0.45 ? 'medium' : 'high',
      };
    });
  }

  private projectOutcome(base: HealthMetrics, modified: HealthMetrics): any {
    const sleepDelta    = (modified.sleepHours || 7) - (base.sleepHours || 7);
    const workoutDelta  = (modified.weeklyWorkouts || 3) - (base.weeklyWorkouts || 3);
    const stressDelta   = (modified.stressLevel || 5) - (base.stressLevel || 5);

    const weightChange  = -((modified.calorieDeficit || 0) - (base.calorieDeficit || 0)) / 7700;
    const strengthGain  = workoutDelta * 2.5;         // kg per week on compound lifts
    const hrvImprovement = sleepDelta * 3 - stressDelta * 2;
    const fatigueDelta  = -sleepDelta * 5 + stressDelta * 3;
    const probability   = Math.max(0.2, Math.min(0.95, 0.6 + sleepDelta * 0.1 - stressDelta * 0.08));

    return {
      projectedWeightChangeKg: Math.round(weightChange * 10) / 10,
      projectedStrengthGainKg: Math.round(strengthGain * 10) / 10,
      projectedHRVChangeMsPerWeek: Math.round(hrvImprovement),
      projectedFatigueChange: Math.round(fatigueDelta * 10) / 10,
      probability: Math.round(probability * 100) / 100,
    };
  }
}

export const scenarioPlanner = new ScenarioPlanner();
