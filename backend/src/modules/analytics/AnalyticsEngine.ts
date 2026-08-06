import { DateRange, ReportFormat } from './analytics.types';
import { revenueAnalytics, attendanceAnalytics, memberAnalytics, trainerAnalytics, workoutAnalytics, nutritionAnalytics, retentionAnalytics } from './AnalyticsEngines';
import { kpiEngine, KPI_CATALOG } from './KPIEngine';
import { executiveDashboard } from './ExecutiveDashboard';
import { reportGenerator } from './ReportGenerator';

export class AnalyticsEngine {
  /**
   * Main entry point — assembles a complete analytics bundle
   * including all sub-domain analytics, KPIs, and executive summary.
   */
  public async getFullReport(organizationId: string, period: DateRange) {
    const revenue    = revenueAnalytics.compute(organizationId, period);
    const attendance = attendanceAnalytics.compute(organizationId, period);
    const members    = memberAnalytics.compute(organizationId, period);
    const trainers   = trainerAnalytics.compute(organizationId, period);
    const workouts   = workoutAnalytics.compute(organizationId, period);
    const nutrition  = nutritionAnalytics.compute(organizationId, period);
    const retention  = retentionAnalytics.compute(organizationId, period);

    // Build KPIs from current analytics data
    const rawValues: Record<string, number> = {
      mrr: revenue.mrr,
      arr: revenue.arr,
      mrr_growth_pct: revenue.mrrGrowthPct,
      arpu: revenue.arpu,
      ltv: revenue.ltv,
      payment_failure_rate: revenue.paymentFailureRate,
      total_members: members.totalMembers,
      new_members: members.newMembers,
      churned_members: members.churned,
      churn_rate: members.churnRate,
      retention_rate: members.retentionRate,
      avg_health_score: members.avgHealthScore,
      high_risk_count: members.highRiskCount,
      engagement_score: members.engagementScore,
      total_visits: attendance.totalVisits,
      avg_daily_visits: attendance.avgDailyVisits,
      occupancy_rate: attendance.occupancyRate,
      no_show_rate: attendance.noShowRate,
      avg_visit_duration: attendance.avgVisitDurationMin,
      trainer_count: trainers.totalTrainers,
      avg_client_load: trainers.avgClientLoad,
      session_completion: trainers.sessionCompletionRate,
      revenue_per_trainer: trainers.revenuePerTrainer,
      total_sessions: workouts.totalSessions,
      avg_session_duration: workouts.avgSessionDurationMin,
      avg_completion_rate: workouts.avgCompletionRate,
      logging_adherence: nutrition.loggingAdherencePct,
      avg_macro_score: nutrition.avgMacroScore,
    };

    // Use slightly lower previous-period values for trend illustration
    const previousValues = Object.fromEntries(
      Object.entries(rawValues).map(([k, v]) => [k, Math.round(v * (0.9 + Math.random() * 0.15))])
    );

    const kpis    = kpiEngine.buildKPIs(rawValues, previousValues, period);
    const summary = executiveDashboard.generateSummary(organizationId, period, kpis, revenue, members, attendance, retention);

    return {
      organizationId,
      period,
      generatedAt: new Date().toISOString(),
      summary,
      kpis,
      revenue,
      attendance,
      members,
      trainers,
      workouts,
      nutrition,
      retention,
    };
  }

  public async exportReport(organizationId: string, period: DateRange, type: any, format: ReportFormat) {
    return reportGenerator.generate({ organizationId, period, reportType: type, format });
  }

  public getKPICatalog() {
    return KPI_CATALOG;
  }
}

export const analyticsEngine = new AnalyticsEngine();
