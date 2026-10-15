import { httpClient } from './httpClient';

export type TimeWindow = '7d' | '30d' | '90d';

export interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
  status: 'calculated' | 'new_baseline' | 'no_data';
  comparisonText: string;
}

export interface MemberTrendPoint {
  date: string;
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
  date: string;
  visits: number;
  uniqueMembers: number;
}

export interface HourlyDistributionPoint {
  hour: string;
  label: string;
  visits: number;
}

export interface DayOfWeekDistributionPoint {
  day: string;
  dayName: string;
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

export interface AnalyticsQueryParams {
  window?: TimeWindow;
  from?: string;
  to?: string;
}

export const analyticsApi = {
  /**
   * Retrieves unified Gym Owner Analytics telemetry.
   */
  getOverview: async (params?: AnalyticsQueryParams): Promise<OwnerAnalyticsOverviewResponse> => {
    const res: any = await httpClient.get('/analytics/overview', { params });
    return res.data;
  },

  /**
   * Retrieves scoped Member Analytics.
   */
  getMembers: async (params?: AnalyticsQueryParams): Promise<MemberAnalyticsData> => {
    const res: any = await httpClient.get('/analytics/members', { params });
    return res.data;
  },

  /**
   * Retrieves scoped Attendance Analytics from canonical attendance_logs.
   */
  getAttendance: async (params?: AnalyticsQueryParams): Promise<AttendanceAnalyticsData> => {
    const res: any = await httpClient.get('/analytics/attendance', { params });
    return res.data;
  },

  /**
   * Retrieves scoped Trainer Analytics from trainer_member_assignments.
   */
  getTrainers: async (params?: AnalyticsQueryParams): Promise<TrainerAnalyticsData> => {
    const res: any = await httpClient.get('/analytics/trainers', { params });
    return res.data;
  },

  /**
   * Retrieves deterministic Retention Analytics.
   */
  getRetention: async (params?: AnalyticsQueryParams): Promise<RetentionAnalyticsData> => {
    const res: any = await httpClient.get('/analytics/retention', { params });
    return res.data;
  },
};
