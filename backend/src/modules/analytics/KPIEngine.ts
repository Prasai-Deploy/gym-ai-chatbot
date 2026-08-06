import { KPIValue, DateRange } from './analytics.types';

// Master KPI catalog — 28 production KPIs across 6 domains
export const KPI_CATALOG: Array<{ key: string; label: string; unit: string; domain: string; benchmark?: number }> = [
  // Revenue
  { key: 'mrr',                  label: 'Monthly Recurring Revenue',    unit: '₹',    domain: 'revenue',     benchmark: 50000 },
  { key: 'arr',                  label: 'Annual Recurring Revenue',     unit: '₹',    domain: 'revenue' },
  { key: 'mrr_growth_pct',       label: 'MRR Growth Rate',             unit: '%',    domain: 'revenue',     benchmark: 10 },
  { key: 'arpu',                 label: 'Avg Revenue Per User',        unit: '₹',    domain: 'revenue',     benchmark: 1200 },
  { key: 'ltv',                  label: 'Member Lifetime Value',       unit: '₹',    domain: 'revenue',     benchmark: 18000 },
  { key: 'payment_failure_rate', label: 'Payment Failure Rate',        unit: '%',    domain: 'revenue',     benchmark: 3 },

  // Members
  { key: 'total_members',        label: 'Total Active Members',        unit: '',     domain: 'members' },
  { key: 'new_members',          label: 'New Members This Period',     unit: '',     domain: 'members' },
  { key: 'churned_members',      label: 'Churned Members',            unit: '',     domain: 'members' },
  { key: 'churn_rate',           label: 'Monthly Churn Rate',         unit: '%',    domain: 'members',     benchmark: 4 },
  { key: 'retention_rate',       label: 'Member Retention Rate',      unit: '%',    domain: 'members',     benchmark: 90 },
  { key: 'avg_health_score',     label: 'Avg Member Health Score',    unit: '/100', domain: 'members',     benchmark: 72 },
  { key: 'high_risk_count',      label: 'High Churn Risk Members',    unit: '',     domain: 'members' },
  { key: 'engagement_score',     label: 'Member Engagement Score',    unit: '/100', domain: 'members',     benchmark: 68 },

  // Attendance
  { key: 'total_visits',         label: 'Total Gym Visits',           unit: '',     domain: 'attendance' },
  { key: 'avg_daily_visits',     label: 'Avg Daily Visits',           unit: '',     domain: 'attendance',  benchmark: 80 },
  { key: 'occupancy_rate',       label: 'Peak Occupancy Rate',        unit: '%',    domain: 'attendance',  benchmark: 70 },
  { key: 'no_show_rate',         label: 'Class No-Show Rate',         unit: '%',    domain: 'attendance',  benchmark: 15 },
  { key: 'avg_visit_duration',   label: 'Avg Visit Duration',         unit: 'min',  domain: 'attendance',  benchmark: 65 },

  // Trainers
  { key: 'trainer_count',        label: 'Active Trainers',            unit: '',     domain: 'trainers' },
  { key: 'avg_client_load',      label: 'Avg Clients Per Trainer',    unit: '',     domain: 'trainers',    benchmark: 15 },
  { key: 'session_completion',   label: 'Session Completion Rate',    unit: '%',    domain: 'trainers',    benchmark: 85 },
  { key: 'revenue_per_trainer',  label: 'Revenue Per Trainer',        unit: '₹',    domain: 'trainers' },

  // Workouts
  { key: 'total_sessions',       label: 'Total Workout Sessions',     unit: '',     domain: 'workouts' },
  { key: 'avg_session_duration', label: 'Avg Session Duration',       unit: 'min',  domain: 'workouts',    benchmark: 52 },
  { key: 'avg_completion_rate',  label: 'Workout Completion Rate',    unit: '%',    domain: 'workouts',    benchmark: 80 },

  // Nutrition
  { key: 'logging_adherence',    label: 'Nutrition Logging Adherence',unit: '%',    domain: 'nutrition',   benchmark: 60 },
  { key: 'avg_macro_score',      label: 'Avg Member Macro Score',     unit: '/100', domain: 'nutrition',   benchmark: 70 },
];

export class KPIEngine {
  private generateTrend(value: number, change: number): KPIValue['trend'] {
    if (Math.abs(change) < 0.5) return 'flat';
    return change > 0 ? 'up' : 'down';
  }

  public buildKPIs(
    rawValues: Record<string, number>,
    previousValues: Record<string, number>,
    period: DateRange
  ): KPIValue[] {
    return KPI_CATALOG.map((kpi) => {
      const value    = rawValues[kpi.key] || 0;
      const prev     = previousValues[kpi.key] || 0;
      const change   = value - prev;
      const changePct = prev > 0 ? Math.round((change / prev) * 1000) / 10 : 0;

      return {
        key: kpi.key,
        label: kpi.label,
        value,
        unit: kpi.unit,
        change,
        changePct,
        trend: this.generateTrend(value, change),
        benchmark: kpi.benchmark,
      };
    });
  }

  public getKPIsByDomain(domain: string): typeof KPI_CATALOG {
    return KPI_CATALOG.filter((k) => k.domain === domain);
  }
}

export const kpiEngine = new KPIEngine();
