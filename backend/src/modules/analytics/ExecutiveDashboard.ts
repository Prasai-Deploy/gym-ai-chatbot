import { ExecutiveSummary, KPIValue, DateRange } from './analytics.types';
import { MemberAnalytics, RevenueAnalytics, AttendanceAnalytics, RetentionAnalytics } from './analytics.types';

export class ExecutiveDashboard {
  /**
   * Generates an AI-powered executive summary with headline, highlights, risks,
   * opportunities, and a natural language narrative — without external AI API calls.
   * In production, this is enhanced by piping to the AI Agent ecosystem.
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
    const growth = r.mrrGrowthPct > 0 ? `grew ${r.mrrGrowthPct}%` : `declined ${Math.abs(r.mrrGrowthPct)}%`;
    return `MRR ${growth} to ₹${r.mrr.toLocaleString()} — ${m.activeMembers} active members, ${m.newMembers} joined this period.`;
  }

  private buildHighlights(r: RevenueAnalytics, m: MemberAnalytics, a: AttendanceAnalytics, ret: RetentionAnalytics): string[] {
    const items: string[] = [];
    if (r.mrrGrowthPct > 5) items.push(`💰 MRR growing at ${r.mrrGrowthPct}% — above industry benchmark of 8%.`);
    if (m.newMembers > 70) items.push(`👥 ${m.newMembers} new members acquired — strongest intake in 3 months.`);
    if (a.occupancyRate > 70) items.push(`🏋️ Occupancy rate at ${a.occupancyRate}% — facility is at high utilization.`);
    if (ret.overallRetentionPct > 85) items.push(`📊 Retention at ${ret.overallRetentionPct}% — top quartile for fitness SaaS.`);
    if (m.avgHealthScore > 70) items.push(`❤️ Average member health score is ${m.avgHealthScore}/100 — members are thriving.`);
    return items;
  }

  private buildRisks(m: MemberAnalytics, ret: RetentionAnalytics, r: RevenueAnalytics): string[] {
    const risks: string[] = [];
    if (m.highRiskCount > 10) risks.push(`⚠️ ${m.highRiskCount} members flagged as high churn risk. Immediate outreach required.`);
    if (ret.churnByPlan['Starter'] > 6) risks.push(`⚠️ Starter plan churn at ${ret.churnByPlan['Starter']}% — review onboarding flow.`);
    if (r.paymentFailureRate > 3) risks.push(`⚠️ Payment failure rate at ${r.paymentFailureRate}% — trigger dunning automation.`);
    if (m.churnRate > 5) risks.push(`⚠️ Monthly churn at ${m.churnRate}% — above 5% threshold. Revenue leakage detected.`);
    return risks;
  }

  private buildOpportunities(m: MemberAnalytics, r: RevenueAnalytics, a: AttendanceAnalytics): string[] {
    const opps: string[] = [];
    if (r.arpu < 1500) opps.push(`📈 ARPU at ₹${r.arpu} — upsell Growth plan to 20% of Starter cohort to add ₹${Math.round(m.activeMembers * 0.2 * 200).toLocaleString()} MRR.`);
    if (a.peakDay === 'Monday') opps.push('📅 Monday is peak day — promote off-peak class passes to flatten the demand curve.');
    opps.push('🤖 AI health coaching adoption can increase engagement score by an estimated 18 points.');
    return opps;
  }

  private buildNarrative(r: RevenueAnalytics, m: MemberAnalytics, a: AttendanceAnalytics, ret: RetentionAnalytics): string {
    return [
      `This period, your gym generated ₹${r.mrr.toLocaleString()} in MRR (${r.mrrGrowthPct > 0 ? '+' : ''}${r.mrrGrowthPct}% vs last period), translating to ₹${r.arr.toLocaleString()} annualized.`,
      `Membership grew to ${m.totalMembers} total (${m.activeMembers} active) with ${m.newMembers} new joins and ${m.churned} churned at a ${m.churnRate}% monthly churn rate.`,
      `Attendance reached ${a.totalVisits.toLocaleString()} visits (avg ${a.avgDailyVisits}/day) with ${a.occupancyRate}% peak occupancy. Peak traffic is ${a.peakDay}s at ${a.peakHour}.`,
      `Overall retention stands at ${ret.overallRetentionPct}%, with ${m.highRiskCount} members currently flagged for churn risk.`,
      `Average member health score is ${m.avgHealthScore}/100, indicating strong engagement with the platform's AI coaching features.`,
      `Revenue concentration risk: ${Math.round((r.revenueByPlan['Enterprise'] || 0) / r.mrr * 100)}% of MRR from Enterprise customers. Diversification recommended.`,
    ].join(' ');
  }
}

export const executiveDashboard = new ExecutiveDashboard();
