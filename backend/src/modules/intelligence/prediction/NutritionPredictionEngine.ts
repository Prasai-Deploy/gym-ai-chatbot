import { HealthMetrics, NutritionPrediction } from './prediction.types';

export class NutritionPredictionEngine {
  private readonly PROTEIN_PER_KG = 2.0;
  private readonly CARB_PER_KG_TRAINING = 3.5;
  private readonly FAT_MIN_G = 50;

  public predict(metrics: HealthMetrics): NutritionPrediction {
    const weight      = metrics.weightKg || 75;
    const weeklyWo    = metrics.weeklyWorkouts || 3;
    const deficit     = metrics.calorieDeficit || 0;

    const { calories, phase } = this.calcTargetCalories(weight, weeklyWo, deficit);
    const proteinG   = Math.round(weight * this.PROTEIN_PER_KG);
    const fatG       = Math.max(this.FAT_MIN_G, Math.round(weight * 0.8));
    const carbG      = Math.round((calories - (proteinG * 4) - (fatG * 9)) / 4);

    return {
      userId: metrics.userId,
      recommendedCalories: calories,
      recommendedProteinG: proteinG,
      recommendedCarbsG: Math.max(50, carbG),
      recommendedFatsG: fatG,
      predictedWeightChangeKg: this.predictWeeklyChange(deficit, phase),
      deficitOrSurplus: phase,
      confidence: 0.78,
    };
  }

  private calcTargetCalories(weightKg: number, weeklyWorkouts: number, currentDeficit: number): { calories: number; phase: NutritionPrediction['deficitOrSurplus'] } {
    // Harris-Benedict simplified TDEE
    const bmr = 10 * weightKg + 625;
    const activityMultiplier = 1.2 + (weeklyWorkouts * 0.05);
    const tdee = Math.round(bmr * activityMultiplier);

    if (currentDeficit > 200) return { calories: tdee - 400, phase: 'deficit' };
    if (currentDeficit < -100) return { calories: tdee + 300, phase: 'surplus' };
    return { calories: tdee, phase: 'maintenance' };
  }

  private predictWeeklyChange(deficit: number, phase: string): number {
    if (phase === 'deficit') return -0.35;
    if (phase === 'surplus') return +0.25;
    return 0;
  }
}

export const nutritionPredictionEngine = new NutritionPredictionEngine();
