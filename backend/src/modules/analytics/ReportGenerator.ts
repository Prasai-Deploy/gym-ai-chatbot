import { ReportRequest, ReportResult, ReportType, ReportFormat } from './analytics.types';
import {
  revenueAnalytics,
  attendanceAnalytics,
  memberAnalytics,
  trainerAnalytics,
  workoutAnalytics,
  nutritionAnalytics,
  retentionAnalytics,
  RevenueAnalyticsEngine,
  AttendanceAnalyticsEngine,
  MemberAnalyticsEngine,
  TrainerAnalyticsEngine,
  WorkoutAnalyticsEngine,
  NutritionAnalyticsEngine,
  RetentionAnalyticsEngine,
} from './AnalyticsEngines';

export class ReportGenerator {
  constructor(
    private readonly engines: {
      revenue?: RevenueAnalyticsEngine;
      attendance?: AttendanceAnalyticsEngine;
      members?: MemberAnalyticsEngine;
      trainers?: TrainerAnalyticsEngine;
      workouts?: WorkoutAnalyticsEngine;
      nutrition?: NutritionAnalyticsEngine;
      retention?: RetentionAnalyticsEngine;
    } = {}
  ) {}

  public async generate(request: ReportRequest): Promise<ReportResult> {
    const data = await this.fetchData(request);
    const formatted = this.format(data, request.format, request.reportType);

    return {
      reportId: `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      reportType: request.reportType,
      format: request.format,
      generatedAt: new Date().toISOString(),
      rowCount: formatted.rowCount,
      data: formatted.data,
      csvContent: formatted.csv,
    };
  }

  private async fetchData(request: ReportRequest): Promise<any> {
    const { organizationId: orgId, period } = request;
    const rev = this.engines.revenue || revenueAnalytics;
    const att = this.engines.attendance || attendanceAnalytics;
    const mem = this.engines.members || memberAnalytics;
    const trn = this.engines.trainers || trainerAnalytics;
    const wrk = this.engines.workouts || workoutAnalytics;
    const nut = this.engines.nutrition || nutritionAnalytics;
    const ret = this.engines.retention || retentionAnalytics;

    switch (request.reportType) {
      case 'revenue':    return await rev.compute(orgId, period);
      case 'attendance': return await att.compute(orgId, period);
      case 'members':    return await mem.compute(orgId, period);
      case 'trainers':   return await trn.compute(orgId, period);
      case 'workouts':   return await wrk.compute(orgId, period);
      case 'nutrition':  return await nut.compute(orgId, period);
      case 'retention':  return await ret.compute(orgId, period);
      default:           return {};
    }
  }

  private format(data: any, format: ReportFormat, type: ReportType): { rowCount: number; data: any; csv?: string } {
    if (format === 'json') {
      return { rowCount: 1, data };
    }

    if (format === 'csv') {
      const csv = this.toCSV(data, type);
      return { rowCount: csv.split('\n').length - 1, data, csv };
    }

    if (format === 'pdf_blueprint') {
      return {
        rowCount: 1,
        data: {
          title: `STRIVA ${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
          subtitle: `Generated ${new Date().toLocaleDateString('en-IN')}`,
          sections: [
            { heading: 'Summary', body: data },
            { heading: 'Trend Analysis', body: data.trendSeries || [] },
          ],
        },
      };
    }

    return { rowCount: 0, data: {} };
  }

  private toCSV(data: any, type: ReportType): string {
    const csvMaps: Partial<Record<ReportType, () => string>> = {
      revenue: () => [
        'Metric,Value',
        `MRR,${data.mrr}`,
        `ARR,${data.arr}`,
        `MRR Growth %,${data.mrrGrowthPct}`,
        `ARPU,${data.arpu}`,
        `LTV,${data.ltv}`,
        `Net Revenue,${data.netRevenue}`,
        `Payment Failure Rate,${data.paymentFailureRate}%`,
      ].join('\n'),

      members: () => [
        'Metric,Value',
        `Total Members,${data.totalMembers}`,
        `Active Members,${data.activeMembers}`,
        `New Members,${data.newMembers}`,
        `Churned,${data.churned}`,
        `Churn Rate,${data.churnRate}%`,
        `Retention Rate,${data.retentionRate}%`,
        `Avg Health Score,${data.avgHealthScore}`,
        `High Risk Count,${data.highRiskCount}`,
      ].join('\n'),

      attendance: () => [
        'Metric,Value',
        `Total Visits,${data.totalVisits}`,
        `Avg Daily Visits,${data.avgDailyVisits}`,
        `Peak Hour,${data.peakHour}`,
        `Peak Day,${data.peakDay}`,
        `Occupancy Rate,${data.occupancyRate}%`,
        `No Show Rate,${data.noShowRate}%`,
        `Avg Duration (min),${data.avgVisitDurationMin}`,
      ].join('\n'),

      trainers: () => [
        'Metric,Value',
        `Total Trainers,${data.totalTrainers}`,
        `Avg Client Load,${data.avgClientLoad}`,
        `Avg Client Health Score,${data.avgClientHealthScore}`,
        `Session Completion Rate,${data.sessionCompletionRate}%`,
        `Revenue Per Trainer,${data.revenuePerTrainer}`,
      ].join('\n'),

      workouts: () => [
        'Metric,Value',
        `Total Sessions,${data.totalSessions}`,
        `Avg Session Duration (min),${data.avgSessionDurationMin}`,
        `Total Volume (kg),${data.totalVolumeKg}`,
        `Avg Completion Rate,${data.avgCompletionRate}%`,
      ].join('\n'),

      nutrition: () => [
        'Metric,Value',
        `Avg Calories Logged,${data.avgCaloriesLogged}`,
        `Avg Protein Adherence %,${data.avgProteinAdherencePct}`,
        `Avg Macro Score,${data.avgMacroScore}`,
        `Members Logging Daily,${data.membersLoggingDaily}`,
        `Logging Adherence %,${data.loggingAdherencePct}`,
        `Top Deficit Day,${data.topDeficitDay}`,
      ].join('\n'),

      retention: () => [
        'Metric,Value',
        `Overall Retention %,${data.overallRetentionPct}`,
        `Avg Days Before Churn,${data.avgDaysBeforeChurn}`,
      ].join('\n'),
    };

    return csvMaps[type]?.() || Object.entries(data).map(([k, v]) => `${k},${v}`).join('\n');
  }
}

export const reportGenerator = new ReportGenerator();
