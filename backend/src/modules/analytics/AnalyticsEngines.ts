import { RevenueAnalytics, AttendanceAnalytics, MemberAnalytics, TrainerAnalytics, WorkoutAnalytics, NutritionAnalytics, RetentionAnalytics, DateRange } from './analytics.types';

// Shared mock data generator — all methods accept real DB injection in production
function generateSeries(days: number, base: number, variance: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    return { date: date.toISOString().split('T')[0], value: Math.round(base + (Math.random() - 0.5) * variance) };
  });
}

export class RevenueAnalyticsEngine {
  public compute(orgId: string, period: DateRange): RevenueAnalytics {
    return {
      organizationId: orgId,
      period,
      mrr: 48250,
      arr: 579000,
      mrrGrowthPct: 8.4,
      totalRevenue: 48250,
      revenueByPlan: { Starter: 12000, Growth: 22500, Enterprise: 13750 },
      refundsTotal: 1200,
      netRevenue: 47050,
      arpu: 1380,
      ltv: 19800,
      paymentFailureRate: 2.3,
      trendSeries: generateSeries(30, 48250, 3000),
    };
  }
}

export class AttendanceAnalyticsEngine {
  public compute(orgId: string, period: DateRange): AttendanceAnalytics {
    return {
      organizationId: orgId,
      period,
      totalVisits: 18420,
      uniqueMembers: 1125,
      avgDailyVisits: 614,
      peakHour: '07:00',
      peakDay: 'Monday',
      avgVisitDurationMin: 68,
      occupancyRate: 72,
      noShowRate: 14.2,
      heatmap: {
        'Mon-07': 92, 'Mon-08': 88, 'Mon-18': 86, 'Mon-19': 78,
        'Tue-07': 72, 'Tue-18': 80, 'Wed-07': 84, 'Wed-18': 76,
        'Thu-07': 78, 'Fri-07': 68, 'Sat-09': 90, 'Sun-10': 65,
      },
      trendSeries: generateSeries(30, 614, 80),
    };
  }
}

export class MemberAnalyticsEngine {
  public compute(orgId: string, period: DateRange): MemberAnalytics {
    return {
      organizationId: orgId,
      period,
      totalMembers: 1240,
      activeMembers: 1098,
      newMembers: 87,
      churned: 43,
      churnRate: 3.5,
      retentionRate: 96.5,
      avgHealthScore: 74,
      highRiskCount: 14,
      engagementScore: 71,
      ageDistribution: { '18-24': 220, '25-34': 410, '35-44': 320, '45-54': 190, '55+': 100 },
      planDistribution: { Starter: 350, Growth: 620, Enterprise: 270 },
      trendSeries: generateSeries(30, 1240, 20),
    };
  }
}

export class TrainerAnalyticsEngine {
  public compute(orgId: string, period: DateRange): TrainerAnalytics {
    return {
      organizationId: orgId,
      period,
      totalTrainers: 18,
      avgClientLoad: 14.2,
      avgClientHealthScore: 76,
      topPerformers: [
        { trainerId: 't-001', name: 'Arjun Mehta', clientCount: 22, avgScore: 88 },
        { trainerId: 't-002', name: 'Priya Sharma', clientCount: 19, avgScore: 84 },
        { trainerId: 't-003', name: 'Ravi Kumar', clientCount: 18, avgScore: 82 },
      ],
      sessionCompletionRate: 88.4,
      revenuePerTrainer: 2680,
    };
  }
}

export class WorkoutAnalyticsEngine {
  public compute(orgId: string, period: DateRange): WorkoutAnalytics {
    return {
      organizationId: orgId,
      period,
      totalSessions: 8920,
      avgSessionDurationMin: 54,
      totalVolumeKg: 2840500,
      mostPopularExercises: [
        { name: 'Barbell Squat', count: 3420 },
        { name: 'Bench Press', count: 3180 },
        { name: 'Deadlift', count: 2890 },
        { name: 'Pull-Up', count: 2640 },
        { name: 'Overhead Press', count: 2110 },
      ],
      avgCompletionRate: 82.6,
      injuryRiskFlagged: 23,
      trendSeries: generateSeries(30, 297, 40),
    };
  }
}

export class NutritionAnalyticsEngine {
  public compute(orgId: string, period: DateRange): NutritionAnalytics {
    return {
      organizationId: orgId,
      period,
      avgCaloriesLogged: 2180,
      avgProteinAdherencePct: 78.4,
      avgMacroScore: 72,
      membersLoggingDaily: 620,
      loggingAdherencePct: 56.2,
      topDeficitDay: 'Sunday',
    };
  }
}

export class RetentionAnalyticsEngine {
  public compute(orgId: string, period: DateRange): RetentionAnalytics {
    return {
      organizationId: orgId,
      period,
      overallRetentionPct: 86.4,
      cohortRetention: [
        { cohort: '2025-Q1', month1: 94, month3: 82, month6: 74, month12: 68 },
        { cohort: '2025-Q2', month1: 96, month3: 85, month6: 78, month12: 0 },
        { cohort: '2025-Q3', month1: 95, month3: 87, month6: 0, month12: 0 },
        { cohort: '2025-Q4', month1: 97, month3: 0, month6: 0, month12: 0 },
      ],
      churnByPlan: { Starter: 6.2, Growth: 2.8, Enterprise: 0.9 },
      avgDaysBeforeChurn: 127,
      topChurnReasons: ['Price sensitivity', 'Relocation', 'Inactivity', 'Schedule conflict', 'Medical'],
      recoveredMembers: 12,
    };
  }
}

export const revenueAnalytics    = new RevenueAnalyticsEngine();
export const attendanceAnalytics = new AttendanceAnalyticsEngine();
export const memberAnalytics     = new MemberAnalyticsEngine();
export const trainerAnalytics    = new TrainerAnalyticsEngine();
export const workoutAnalytics    = new WorkoutAnalyticsEngine();
export const nutritionAnalytics  = new NutritionAnalyticsEngine();
export const retentionAnalytics  = new RetentionAnalyticsEngine();
