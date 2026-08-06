import { BusinessForecast } from './prediction.types';

export interface BusinessMetrics {
  organizationId: string;
  currentMRR: number;
  activeMembers: number;
  avgMonthlyChurnRate: number;     // e.g. 0.04 = 4%
  avgMonthlyNewMembers: number;
  avgRevenuePerMember: number;
  attendanceRate: number;          // 0–1
  highRiskMemberIds?: string[];
}

export class BusinessForecastEngine {
  /**
   * Projects MRR, member count, churn, and attendance 3 months forward.
   * Uses compound churn decay with new member growth injection.
   */
  public forecast(metrics: BusinessMetrics, period: BusinessForecast['period'] = 'monthly'): BusinessForecast {
    const months     = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
    const churnRate  = metrics.avgMonthlyChurnRate;
    const newPerMonth = metrics.avgMonthlyNewMembers;

    // Compound member projection over N months
    let projectedMembers = metrics.activeMembers;
    for (let i = 0; i < months; i++) {
      projectedMembers = Math.round(projectedMembers * (1 - churnRate) + newPerMonth);
    }

    const projectedMRR    = Math.round(projectedMembers * metrics.avgRevenuePerMember);
    const revenueGrowthPct = ((projectedMRR - metrics.currentMRR) / metrics.currentMRR) * 100;
    const predictedAttendance = Math.round(projectedMembers * metrics.attendanceRate * 26); // avg visits/month

    return {
      organizationId: metrics.organizationId,
      period,
      predictedMRR: projectedMRR,
      predictedNewMembers: Math.round(newPerMonth * months),
      predictedChurnRate: churnRate,
      predictedAttendance,
      revenueGrowthPct: Math.round(revenueGrowthPct * 10) / 10,
      churnRiskMemberIds: metrics.highRiskMemberIds || [],
      confidence: 0.72,
    };
  }

  public generateScenarios(metrics: BusinessMetrics): { optimistic: BusinessForecast; base: BusinessForecast; pessimistic: BusinessForecast } {
    return {
      optimistic: this.forecast({ ...metrics, avgMonthlyChurnRate: metrics.avgMonthlyChurnRate * 0.6, avgMonthlyNewMembers: metrics.avgMonthlyNewMembers * 1.5 }, 'quarterly'),
      base: this.forecast(metrics, 'quarterly'),
      pessimistic: this.forecast({ ...metrics, avgMonthlyChurnRate: metrics.avgMonthlyChurnRate * 1.5, avgMonthlyNewMembers: metrics.avgMonthlyNewMembers * 0.7 }, 'quarterly'),
    };
  }
}

export const businessForecastEngine = new BusinessForecastEngine();
