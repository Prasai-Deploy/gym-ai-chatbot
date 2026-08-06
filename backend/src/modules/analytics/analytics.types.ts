// ─── Shared Analytics Types ──────────────────────────────────────────────────

export interface DateRange {
  from: string;  // ISO date string
  to: string;
}

export interface TimeSeries {
  date: string;
  value: number;
}

export interface KPIValue {
  key: string;
  label: string;
  value: number;
  unit: string;
  change: number;        // vs previous period
  changePct: number;
  trend: 'up' | 'down' | 'flat';
  benchmark?: number;    // Industry benchmark for comparison
}

// ─── Revenue Analytics ───────────────────────────────────────────────────────

export interface RevenueAnalytics {
  organizationId: string;
  period: DateRange;
  mrr: number;
  arr: number;
  mrrGrowthPct: number;
  totalRevenue: number;
  revenueByPlan: Record<string, number>;
  refundsTotal: number;
  netRevenue: number;
  arpu: number;         // Average Revenue Per User
  ltv: number;          // Lifetime Value estimate
  paymentFailureRate: number;
  trendSeries: TimeSeries[];
}

// ─── Attendance Analytics ────────────────────────────────────────────────────

export interface AttendanceAnalytics {
  organizationId: string;
  period: DateRange;
  totalVisits: number;
  uniqueMembers: number;
  avgDailyVisits: number;
  peakHour: string;
  peakDay: string;
  avgVisitDurationMin: number;
  occupancyRate: number;
  noShowRate: number;
  heatmap: Record<string, number>;    // e.g. 'Mon-09:00': 42
  trendSeries: TimeSeries[];
}

// ─── Member Analytics ────────────────────────────────────────────────────────

export interface MemberAnalytics {
  organizationId: string;
  period: DateRange;
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  churned: number;
  churnRate: number;
  retentionRate: number;
  avgHealthScore: number;
  highRiskCount: number;
  engagementScore: number;          // 0–100
  ageDistribution: Record<string, number>;
  planDistribution: Record<string, number>;
  trendSeries: TimeSeries[];
}

// ─── Trainer Analytics ───────────────────────────────────────────────────────

export interface TrainerAnalytics {
  organizationId: string;
  period: DateRange;
  totalTrainers: number;
  avgClientLoad: number;
  avgClientHealthScore: number;
  topPerformers: Array<{ trainerId: string; name: string; clientCount: number; avgScore: number }>;
  sessionCompletionRate: number;
  revenuePerTrainer: number;
}

// ─── Workout Analytics ───────────────────────────────────────────────────────

export interface WorkoutAnalytics {
  organizationId: string;
  period: DateRange;
  totalSessions: number;
  avgSessionDurationMin: number;
  totalVolumeKg: number;
  mostPopularExercises: Array<{ name: string; count: number }>;
  avgCompletionRate: number;
  injuryRiskFlagged: number;
  trendSeries: TimeSeries[];
}

// ─── Nutrition Analytics ─────────────────────────────────────────────────────

export interface NutritionAnalytics {
  organizationId: string;
  period: DateRange;
  avgCaloriesLogged: number;
  avgProteinAdherencePct: number;
  avgMacroScore: number;
  membersLoggingDaily: number;
  loggingAdherencePct: number;
  topDeficitDay: string;
}

// ─── Retention Analytics ─────────────────────────────────────────────────────

export interface RetentionAnalytics {
  organizationId: string;
  period: DateRange;
  overallRetentionPct: number;
  cohortRetention: Array<{ cohort: string; month1: number; month3: number; month6: number; month12: number }>;
  churnByPlan: Record<string, number>;
  avgDaysBeforeChurn: number;
  topChurnReasons: string[];
  recoveredMembers: number;
}

// ─── Executive Summary ───────────────────────────────────────────────────────

export interface ExecutiveSummary {
  organizationId: string;
  period: DateRange;
  generatedAt: string;
  headline: string;
  highlights: string[];
  risks: string[];
  opportunities: string[];
  aiNarrative: string;
  kpis: KPIValue[];
}

// ─── Report ──────────────────────────────────────────────────────────────────

export type ReportFormat = 'json' | 'csv' | 'pdf_blueprint';
export type ReportType = 'executive' | 'revenue' | 'attendance' | 'members' | 'trainers' | 'workouts' | 'nutrition' | 'retention';

export interface ReportRequest {
  organizationId: string;
  reportType: ReportType;
  format: ReportFormat;
  period: DateRange;
  filters?: Record<string, any>;
}

export interface ReportResult {
  reportId: string;
  reportType: ReportType;
  format: ReportFormat;
  generatedAt: string;
  rowCount: number;
  data: any;
  csvContent?: string;
}
