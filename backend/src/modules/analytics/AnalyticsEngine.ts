import { DateRange, ReportFormat, ReportType } from './analytics.types';
import {
  revenueAnalytics,
  attendanceAnalytics,
  memberAnalytics,
  trainerAnalytics,
  workoutAnalytics,
  nutritionAnalytics,
  retentionAnalytics,
} from './AnalyticsEngines';
import { kpiEngine, KPI_CATALOG } from './KPIEngine';
import { executiveDashboard } from './ExecutiveDashboard';
import { reportGenerator } from './ReportGenerator';

export class AnalyticsEngine {
  /**
   * Calculates the exact previous period date range of identical duration.
   */
  private getPreviousPeriod(period: DateRange): DateRange {
    const fromTime = new Date(period.from).getTime();
    const toTime = new Date(period.to).getTime();
    const duration = Math.max(86400000, toTime - fromTime + 86400000);

    const prevToDate = new Date(fromTime - 86400000);
    const prevFromDate = new Date(prevToDate.getTime() - duration + 86400000);

    return {
      from: prevFromDate.toISOString().split('T')[0],
      to: prevToDate.toISOString().split('T')[0],
    };
  }

  /**
   * Main entry point — assembles a complete analytics bundle
   * including all sub-domain analytics, real KPIs, and executive summary.
   */
  public async getFullReport(organizationId: string, period: DateRange) {
    const previousPeriod = this.getPreviousPeriod(period);

    // Compute current period metrics from PostgreSQL
    const [revenue, attendance, members, trainers, workouts, nutrition, retention] = await Promise.all([
      revenueAnalytics.compute(organizationId, period),
      attendanceAnalytics.compute(organizationId, period),
      memberAnalytics.compute(organizationId, period),
      trainerAnalytics.compute(organizationId, period),
      workoutAnalytics.compute(organizationId, period),
      nutritionAnalytics.compute(organizationId, period),
      retentionAnalytics.compute(organizationId, period),
    ]);

    // Compute real previous period metrics for accurate period-over-period changes
    const [prevRevenue, prevAttendance, prevMembers, prevTrainers, prevWorkouts, prevNutrition] =
      await Promise.all([
        revenueAnalytics.compute(organizationId, previousPeriod),
        attendanceAnalytics.compute(organizationId, previousPeriod),
        memberAnalytics.compute(organizationId, previousPeriod),
        trainerAnalytics.compute(organizationId, previousPeriod),
        workoutAnalytics.compute(organizationId, previousPeriod),
        nutritionAnalytics.compute(organizationId, previousPeriod),
      ]);

    // Update real MRR growth rate
    if (prevRevenue.mrr > 0) {
      revenue.mrrGrowthPct = Math.round(((revenue.mrr - prevRevenue.mrr) / prevRevenue.mrr) * 1000) / 10;
    } else if (revenue.mrr > 0) {
      revenue.mrrGrowthPct = 100;
    } else {
      revenue.mrrGrowthPct = 0;
    }

    // Build real raw values
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

    const previousValues: Record<string, number> = {
      mrr: prevRevenue.mrr,
      arr: prevRevenue.arr,
      mrr_growth_pct: prevRevenue.mrrGrowthPct,
      arpu: prevRevenue.arpu,
      ltv: prevRevenue.ltv,
      payment_failure_rate: prevRevenue.paymentFailureRate,
      total_members: prevMembers.totalMembers,
      new_members: prevMembers.newMembers,
      churned_members: prevMembers.churned,
      churn_rate: prevMembers.churnRate,
      retention_rate: prevMembers.retentionRate,
      avg_health_score: prevMembers.avgHealthScore,
      high_risk_count: prevMembers.highRiskCount,
      engagement_score: prevMembers.engagementScore,
      total_visits: prevAttendance.totalVisits,
      avg_daily_visits: prevAttendance.avgDailyVisits,
      occupancy_rate: prevAttendance.occupancyRate,
      no_show_rate: prevAttendance.noShowRate,
      avg_visit_duration: prevAttendance.avgVisitDurationMin,
      trainer_count: prevTrainers.totalTrainers,
      avg_client_load: prevTrainers.avgClientLoad,
      session_completion: prevTrainers.sessionCompletionRate,
      revenue_per_trainer: prevTrainers.revenuePerTrainer,
      total_sessions: prevWorkouts.totalSessions,
      avg_session_duration: prevWorkouts.avgSessionDurationMin,
      avg_completion_rate: prevWorkouts.avgCompletionRate,
      logging_adherence: prevNutrition.loggingAdherencePct,
      avg_macro_score: prevNutrition.avgMacroScore,
    };

    const kpis = kpiEngine.buildKPIs(rawValues, previousValues, period);
    const summary = executiveDashboard.generateSummary(
      organizationId,
      period,
      kpis,
      revenue,
      members,
      attendance,
      retention
    );

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

  public async exportReport(
    organizationId: string,
    period: DateRange,
    type: ReportType,
    format: ReportFormat
  ) {
    return reportGenerator.generate({ organizationId, period, reportType: type, format });
  }

  public getKPICatalog() {
    return KPI_CATALOG;
  }
}

export const analyticsEngine = new AnalyticsEngine();
