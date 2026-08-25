import { ExecutiveSummary, KPIValue, DateRange } from './analytics.types';
import { MemberAnalytics, RevenueAnalytics, AttendanceAnalytics, RetentionAnalytics } from './analytics.types';

export class ExecutiveDashboard {
  /**
   * Generates a data-driven executive summary with headline, highlights, risks,
   * opportunities, and a natural language narrative from real KPI values.
   */
  public generateSummary(
    orgId: string,
    period: DateRange,
    kpis: KPIValue[],
    revenue: RevenueAnalytics,
    members: MemberAnalytics,
    attendance: AttendanceAnalytics,
    retention: RetentionAnalytics
  ): ExecutiveSummary {
    const highlights = this.buildHighlights(revenue, members, attendance, retention);
    const risks      = this.buildRisks(members, retention, revenue);
    const opportunities = this.buildOpportunities(members, revenue, attendance);
    const headline   = this.buildHeadline(revenue, members);
    const narrative  = this.buildNarrative(revenue, members, attendance, retention);

    return {
      organizationId: orgId,
      period,
      generatedAt: new Date().toISOString(),
      headline,
      highlights,
      risks,
      opportunities,
      aiNarrative: narrative,
      kpis,
    };
  }

  private buildHeadline(r: RevenueAnalytics, m: MemberAnalytics): string {
    if (r.mrr === 0 && m.totalMembers === 0) {
      return 'No active revenue or membership data recorded for this period.';
    }
    const growth = r.mrrGrowthPct >= 0 ? `grew ${r.mrrGrowthPct}%` : `declined ${Math.abs(r.mrrGrowthPct)}%`;
    return `MRR ${growth} to ₹${r.mrr.toLocaleString()} — ${m.activeMembers} active members, ${m.newMembers} joined this period.`;
  }

  private buildHighlights(r: RevenueAnalytics, m: MemberAnalytics, a: AttendanceAnalytics, ret: RetentionAnalytics): string[] {
    const items: string[] = [];
    if (r.mrrGrowthPct > 5) items.push(`💰 MRR growing at ${r.mrrGrowthPct}% — above industry benchmark.`);
    if (m.newMembers > 0) items.push(`👥 ${m.newMembers} new member(s) acquired in this period.`);
    if (a.occupancyRate > 50) items.push(`🏋️ Facility occupancy rate at ${a.occupancyRate}%.`);
    if (ret.overallRetentionPct > 80) items.push(`📊 Member retention strong at ${ret.overallRetentionPct}%.`);
    if (m.avgHealthScore > 60) items.push(`❤️ Average member health score is ${m.avgHealthScore}/100.`);
    if (items.length === 0) items.push('📈 Baseline performance tracked across all operational domains.');
    return items;
  }

  private buildRisks(m: MemberAnalytics, ret: RetentionAnalytics, r: RevenueAnalytics): string[] {
    const risks: string[] = [];
    if (m.highRiskCount > 0) risks.push(`⚠️ ${m.highRiskCount} member(s) flagged as high churn risk. Proactive outreach recommended.`);
    if (ret.churnByPlan['Starter'] && ret.churnByPlan['Starter'] > 5) risks.push(`⚠️ Starter plan churn at ${ret.churnByPlan['Starter']}%.`);
    if (r.paymentFailureRate > 3) risks.push(`⚠️ Payment failure rate at ${r.paymentFailureRate}% — review dunning pipeline.`);
    if (m.churnRate > 5) risks.push(`⚠️ Monthly churn at ${m.churnRate}% — above 5% threshold.`);
    if (risks.length === 0) risks.push('✅ No critical operational or churn risks detected in this period.');
    return risks;
  }

  private buildOpportunities(m: MemberAnalytics, r: RevenueAnalytics, a: AttendanceAnalytics): string[] {
    const opps: string[] = [];
    if (r.arpu > 0 && r.arpu < 1500 && m.activeMembers > 0) {
      opps.push(`📈 ARPU at ₹${r.arpu} — upsell premium tiers to expand recurring subscription value.`);
    }
    if (a.peakDay && a.peakDay !== 'N/A') {
      opps.push(`📅 Peak visit day is ${a.peakDay} — optimize staffing and class schedule.`);
    }
    opps.push('🤖 Promote AI fitness & nutrition coaching to improve member logging and retention.');
    return opps;
  }

  private buildNarrative(r: RevenueAnalytics, m: MemberAnalytics, a: AttendanceAnalytics, ret: RetentionAnalytics): string {
    const enterpriseRev = r.revenueByPlan['Enterprise'] || r.revenueByPlan['elite'] || 0;
    const concRisk = r.mrr > 0 ? Math.round((enterpriseRev / r.mrr) * 100) : 0;

    return [
      `This period, your facility recorded ₹${r.mrr.toLocaleString()} in MRR (${r.mrrGrowthPct >= 0 ? '+' : ''}${r.mrrGrowthPct}% vs previous period), translating to ₹${r.arr.toLocaleString()} annualized.`,
      `Membership stands at ${m.totalMembers} total (${m.activeMembers} active) with ${m.newMembers} new member(s) and ${m.churned} churned at a ${m.churnRate}% churn rate.`,
      `Attendance reached ${a.totalVisits.toLocaleString()} visits (avg ${a.avgDailyVisits}/day) with ${a.occupancyRate}% peak occupancy. Peak traffic: ${a.peakDay}s at ${a.peakHour}.`,
      `Overall retention stands at ${ret.overallRetentionPct}%, with ${m.highRiskCount} member(s) currently flagged for churn risk.`,
      `Average member health score is ${m.avgHealthScore}/100.`,
      concRisk > 0 ? `Tier concentration: ${concRisk}% of revenue from top-tier subscriptions.` : 'Revenue is balanced across subscription tiers.',
    ].join(' ');
  }
}

export const executiveDashboard = new ExecutiveDashboard();
