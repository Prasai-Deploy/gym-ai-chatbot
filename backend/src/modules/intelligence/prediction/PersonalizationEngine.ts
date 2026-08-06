import { HealthMetrics } from './prediction.types';

export interface PersonalizationProfile {
  userId: string;
  preferredWorkoutTime: 'morning' | 'afternoon' | 'evening';
  preferredIntensityStyle: 'progressive' | 'undulating' | 'steady';
  dietaryPattern: 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo';
  motivationDriver: 'performance' | 'aesthetics' | 'health' | 'competition';
  communicationStyle: 'data-driven' | 'motivational' | 'educational';
  adaptabilityScore: number; // 0–1: how quickly the user adapts to new stimuli
}

export interface PersonalizedRecommendation {
  userId: string;
  workoutAdjustments: string[];
  nutritionAdjustments: string[];
  recoveryStrategies: string[];
  motivationMessage: string;
  nextMilestone: string;
}

export class PersonalizationEngine {
  public buildProfile(userId: string, metrics: HealthMetrics, behaviorSignals?: Partial<PersonalizationProfile>): PersonalizationProfile {
    return {
      userId,
      preferredWorkoutTime: behaviorSignals?.preferredWorkoutTime || 'morning',
      preferredIntensityStyle: (metrics.weeklyWorkouts || 0) > 4 ? 'undulating' : 'progressive',
      dietaryPattern: behaviorSignals?.dietaryPattern || 'omnivore',
      motivationDriver: behaviorSignals?.motivationDriver || 'performance',
      communicationStyle: behaviorSignals?.communicationStyle || 'data-driven',
      adaptabilityScore: Math.min(1, (metrics.streakDays || 0) / 90),
    };
  }

  public recommend(metrics: HealthMetrics, profile: PersonalizationProfile): PersonalizedRecommendation {
    const workoutAdjustments = this.workoutAdjustments(metrics, profile);
    const nutritionAdjustments = this.nutritionAdjustments(metrics, profile);
    const recoveryStrategies = this.recoveryStrategies(metrics, profile);

    return {
      userId: metrics.userId,
      workoutAdjustments,
      nutritionAdjustments,
      recoveryStrategies,
      motivationMessage: this.motivationMessage(profile),
      nextMilestone: this.nextMilestone(metrics),
    };
  }

  private workoutAdjustments(m: HealthMetrics, p: PersonalizationProfile): string[] {
    const recs: string[] = [];
    if (p.preferredIntensityStyle === 'undulating') {
      recs.push('Apply Daily Undulating Periodization — alternate hypertrophy, strength, and power days.');
    } else {
      recs.push('Apply linear progressive overload — add 2.5kg to compound lifts each week.');
    }
    if (p.preferredWorkoutTime === 'morning') {
      recs.push('Include 10-min morning mobility protocol before training for optimal joint prep.');
    }
    return recs;
  }

  private nutritionAdjustments(m: HealthMetrics, p: PersonalizationProfile): string[] {
    const recs: string[] = [];
    if (p.dietaryPattern === 'vegan') {
      recs.push('Supplement with creatine monohydrate (5g/day) and B12 to optimize plant-based performance.');
    }
    if (p.motivationDriver === 'aesthetics') {
      recs.push('Focus on 200–300 kcal deficit with high protein (2.2g/kg) to preserve muscle during cut.');
    }
    return recs;
  }

  private recoveryStrategies(m: HealthMetrics, p: PersonalizationProfile): string[] {
    const recs: string[] = [];
    if (p.adaptabilityScore < 0.3) {
      recs.push('Implement structured deload weeks every 4th week to accelerate long-term adaptation.');
    }
    recs.push('Use HRV-guided training decisions: train hard on green days, light on amber, rest on red.');
    return recs;
  }

  private motivationMessage(p: PersonalizationProfile): string {
    const messages: Record<PersonalizationProfile['motivationDriver'], string> = {
      performance: 'Every session is data. Push the numbers — your future self is being built today.',
      aesthetics: 'The body is sculpted in the gym, revealed in the kitchen, and built in your sleep.',
      health: 'Consistency over intensity. The greatest investment is in your long-term health.',
      competition: 'Your competition is training right now. Train like someone else wants your crown.',
    };
    return messages[p.motivationDriver];
  }

  private nextMilestone(m: HealthMetrics): string {
    const streak = m.streakDays || 0;
    if (streak < 30) return `${30 - streak} days to your 30-day consistency milestone.`;
    if (streak < 60) return `${60 - streak} days to your 60-day discipline milestone.`;
    if (streak < 90) return `${90 - streak} days to your 90-day transformation milestone.`;
    return 'Legendary consistency unlocked. Set your next performance goal.';
  }
}

export const personalizationEngine = new PersonalizationEngine();
