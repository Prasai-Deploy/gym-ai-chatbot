import { ReportRequest, ReportResult, ReportType, ReportFormat } from './analytics.types';
import { revenueAnalytics, attendanceAnalytics, memberAnalytics, trainerAnalytics, workoutAnalytics, nutritionAnalytics, retentionAnalytics } from './AnalyticsEngines';

export class ReportGenerator {
  public async generate(request: ReportRequest): Promise<ReportResult> {
    const data = this.fetchData(request);
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

  private fetchData(request: ReportRequest): any {
    const { organizationId: orgId, period } = request;
    switch (request.reportType) {
      case 'revenue':    return revenueAnalytics.compute(orgId, period);
      case 'attendance': return attendanceAnalytics.compute(orgId, period);
      case 'members':    return memberAnalytics.compute(orgId, period);
      case 'trainers':   return trainerAnalytics.compute(orgId, period);
      case 'workouts':   return workoutAnalytics.compute(orgId, period);
      case 'nutrition':  return nutritionAnalytics.compute(orgId, period);
      case 'retention':  return retentionAnalytics.compute(orgId, period);
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
      // PDF blueprint returns structured sections for client-side PDF rendering
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
    };

    return csvMaps[type]?.() || Object.entries(data).map(([k, v]) => `${k},${v}`).join('\n');
  }
}

export const reportGenerator = new ReportGenerator();
