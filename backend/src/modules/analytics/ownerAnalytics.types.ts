export type TimeWindow = '7d' | '30d' | '90d';

export interface TimeWindowBounds {
  window: TimeWindow;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  daysInPeriod: number;
  previousFrom: string; // YYYY-MM-DD
  previousTo: string; // YYYY-MM-DD
}

export type MetricComparisonStatus = 'calculated' | 'new_baseline' | 'no_data';

export interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
  status: MetricComparisonStatus;
  comparisonText: string;
}

export interface MemberTrendPoint {
  date: string; // YYYY-MM-DD
  newMembers: number;
  cumulativeMembers: number;
}

export interface MemberAnalyticsData {
  totalMembers: number;
  activeMembers: number;
  trialMembers: number;
  inactiveMembers: number;
  newMembers: number;
  growth: MetricComparison;
  trendSeries: MemberTrendPoint[];
  planDistribution: Record<string, number>;
  statusDistribution: {
    active: number;
    trial: number;
    inactive: number;
  };
  hasData: boolean;
}

export interface AttendanceTrendPoint {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueMembers: number;
}

export interface HourlyDistributionPoint {
  hour: string; // HH:00
  label: string; // e.g. 06 AM
  visits: number;
}

export interface DayOfWeekDistributionPoint {
  day: string; // Mon, Tue...
  dayName: string; // Monday...
  visits: number;
}

export interface AttendanceAnalyticsData {
  totalVisits: number;
  uniqueMembers: number;
  avgDailyVisits: number;
  avgVisitsPerMember: number;
  avgDurationMinutes: number;
  peakHour: string;
  peakDay: string;
  visitsComparison: MetricComparison;
  trendSeries: AttendanceTrendPoint[];
  hourlyDistribution: HourlyDistributionPoint[];
  dayOfWeekDistribution: DayOfWeekDistributionPoint[];
  hasData: boolean;
}

export interface TrainerRosterDistributionItem {
  trainerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  assignedMembersCount: number;
}

export interface TrainerAnalyticsData {
  totalTrainers: number;
  assignedMembers: number;
  unassignedMembers: number;
  avgMembersPerTrainer: number;
  rosterDistribution: TrainerRosterDistributionItem[];
  hasData: boolean;
}

export interface RetentionAnalyticsData {
  retentionRate: number | null;
  returningMembers: number;
  previousUniqueMembers: number;
  status: 'calculated' | 'insufficient_history';
  definition: string;
  message: string;
  activeMemberRatio: number;
  hasData: boolean;
}

export interface DeferredFinancialsNotice {
  status: 'deferred_phase_8h';
  note: string;
}

export interface OwnerAnalyticsOverviewResponse {
  organizationId: string;
  timeWindow: TimeWindow;
  period: {
    from: string;
    to: string;
    days: number;
  };
  previousPeriod: {
    from: string;
    to: string;
    days: number;
  };
  members: MemberAnalyticsData;
  attendance: AttendanceAnalyticsData;
  trainers: TrainerAnalyticsData;
  retention: RetentionAnalyticsData;
  financials: DeferredFinancialsNotice;
}
