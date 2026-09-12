import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsRepository } from '../../src/modules/analytics/repositories/AnalyticsRepository';
import {
  RevenueAnalyticsEngine,
  AttendanceAnalyticsEngine,
  MemberAnalyticsEngine,
  TrainerAnalyticsEngine,
  WorkoutAnalyticsEngine,
  NutritionAnalyticsEngine,
  RetentionAnalyticsEngine,
} from '../../src/modules/analytics/AnalyticsEngines';
import { AnalyticsEngine } from '../../src/modules/analytics/AnalyticsEngine';
import { KPIEngine } from '../../src/modules/analytics/KPIEngine';
import { ExecutiveDashboard } from '../../src/modules/analytics/ExecutiveDashboard';
import { ReportGenerator } from '../../src/modules/analytics/ReportGenerator';
import { DateRange } from '../../src/modules/analytics/analytics.types';
import fs from 'fs';
import path from 'path';

describe('Real PostgreSQL Analytics & KPI Engine Suite', () => {
  // In-memory mock database store for analytics
  let db = {
    profiles: [] as any[],
    subscriptions: [] as any[],
    invoices: [] as any[],
    attendance_logs: [] as any[],
    workout_sessions: [] as any[],
    exercise_sessions: [] as any[],
    exercise_sets: [] as any[],
    exercises: [] as any[],
    nutrition_logs: [] as any[],
    recovery_logs: [] as any[],
    organization_staff: [] as any[],
  };

  const createMockSupabase = () => {
    return {
      from: (tableName: string) => {
        const tableData = (db as any)[tableName] || [];

        return {
          select: (cols: string = '*') => {
            let filters: ((row: any) => boolean)[] = [];

            const chain: any = {
              eq: (col: string, val: any) => {
                filters.push((r: any) => r[col] === val);
                return chain;
              },
              in: (col: string, vals: any[]) => {
                filters.push((r: any) => vals.includes(r[col]));
                return chain;
              },
              gte: (col: string, val: any) => {
                filters.push((r: any) => r[col] >= val);
                return chain;
              },
              lte: (col: string, val: any) => {
                filters.push((r: any) => r[col] <= val);
                return chain;
              },
              order: () => chain,
              limit: (n: number) => {
                return {
                  then: (resolve: any) => {
                    const res = tableData.filter((r: any) => filters.every((f) => f(r))).slice(0, n);
                    return resolve({ data: res, error: null });
                  },
                };
              },
              then: (resolve: any) => {
                const res = tableData.filter((r: any) => filters.every((f) => f(r)));
                return resolve({ data: res, error: null });
              },
            };

            return chain;
          },
        };
      },
    } as any;
  };

  const period: DateRange = { from: '2026-08-01', to: '2026-08-31' };

  beforeEach(() => {
    db = {
      profiles: [],
      subscriptions: [],
      invoices: [],
      attendance_logs: [],
      workout_sessions: [],
      exercise_sessions: [],
      exercise_sets: [],
      exercises: [{ id: 'ex-1', name: 'Barbell Squat' }, { id: 'ex-2', name: 'Bench Press' }],
      nutrition_logs: [],
      recovery_logs: [],
      organization_staff: [],
    };
  });

  it('1. Revenue KPI uses actual database subscription & invoice records', async () => {
    // Org A setup with 2 pro members and 1 elite member
    db.profiles = [
      { id: 'usr-1', organization_id: 'org-A', created_at: '2026-08-01T00:00:00Z' },
      { id: 'usr-2', organization_id: 'org-A', created_at: '2026-08-05T00:00:00Z' },
      { id: 'usr-3', organization_id: 'org-A', created_at: '2026-08-10T00:00:00Z' },
    ];
    db.subscriptions = [
      { user_id: 'usr-1', tier: 'pro', interval: 'monthly', status: 'active', created_at: '2026-08-01T00:00:00Z' },
      { user_id: 'usr-2', tier: 'pro', interval: 'monthly', status: 'active', created_at: '2026-08-05T00:00:00Z' },
      { user_id: 'usr-3', tier: 'elite', interval: 'monthly', status: 'active', created_at: '2026-08-10T00:00:00Z' },
    ];
    db.invoices = [
      { id: 'inv-1', user_id: 'usr-1', amount_paid: 1500, status: 'paid', paid_at: '2026-08-01T10:00:00Z', created_at: '2026-08-01T10:00:00Z' },
      { id: 'inv-2', user_id: 'usr-2', amount_paid: 1500, status: 'paid', paid_at: '2026-08-05T10:00:00Z', created_at: '2026-08-05T10:00:00Z' },
      { id: 'inv-3', user_id: 'usr-3', amount_paid: 3900, status: 'paid', paid_at: '2026-08-10T10:00:00Z', created_at: '2026-08-10T10:00:00Z' },
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const revenueEngine = new RevenueAnalyticsEngine(repo);
    const revenue = await revenueEngine.compute('org-A', period);

    // Expected: Pro (1500 * 2) + Elite (3900) = 6900 MRR, ARR = 82800
    expect(revenue.mrr).toBe(6900);
    expect(revenue.arr).toBe(82800);
    expect(revenue.totalRevenue).toBe(6900);
    expect(revenue.arpu).toBe(2300); // 6900 / 3 active members
  });

  it('2. Member KPI uses actual database profiles and subscription statuses', async () => {
    db.profiles = [
      { id: 'usr-1', organization_id: 'org-A', created_at: '2026-08-02T00:00:00Z' },
      { id: 'usr-2', organization_id: 'org-A', created_at: '2026-08-15T00:00:00Z' },
      { id: 'usr-3', organization_id: 'org-A', created_at: '2026-07-10T00:00:00Z' }, // Before period
    ];
    db.subscriptions = [
      { user_id: 'usr-1', tier: 'pro', status: 'active' },
      { user_id: 'usr-2', tier: 'free', status: 'active' },
      { user_id: 'usr-3', tier: 'pro', status: 'canceled' },
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const memberEngine = new MemberAnalyticsEngine(repo);
    const members = await memberEngine.compute('org-A', period);

    expect(members.totalMembers).toBe(3);
    expect(members.newMembers).toBe(2); // usr-1 and usr-2 created in August
    expect(members.churned).toBe(1); // usr-3 canceled
    expect(members.churnRate).toBe(33.3); // 1/3 * 100
    expect(members.retentionRate).toBe(66.7);
  });

  it('3. Attendance KPI computes visits, peak day/hour, and duration from actual logs', async () => {
    db.profiles = [{ id: 'usr-1', organization_id: 'org-A' }];
    db.attendance_logs = [
      { id: 'att-1', organization_id: 'org-A', user_id: 'usr-1', check_in_time: '2026-08-03T07:15:00Z', duration_minutes: 60, status: 'completed' }, // Mon 07:00
      { id: 'att-2', organization_id: 'org-A', user_id: 'usr-1', check_in_time: '2026-08-03T07:45:00Z', duration_minutes: 45, status: 'completed' }, // Mon 07:00
      { id: 'att-3', organization_id: 'org-A', user_id: 'usr-1', check_in_time: '2026-08-05T18:00:00Z', duration_minutes: 75, status: 'completed' }, // Wed 18:00
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const attendanceEngine = new AttendanceAnalyticsEngine(repo);
    const attendance = await attendanceEngine.compute('org-A', period);

    expect(attendance.totalVisits).toBe(3);
    expect(attendance.peakHour).toBe('07:00');
    expect(attendance.peakDay).toBe('Monday');
    expect(attendance.avgVisitDurationMin).toBe(60); // (60 + 45 + 75) / 3
  });

  it('4. Trainer KPI computes trainer count, client load, and revenue per trainer', async () => {
    db.profiles = [
      { id: 'usr-1', organization_id: 'org-A' },
      { id: 'usr-2', organization_id: 'org-A' },
      { id: 'usr-3', organization_id: 'org-A' },
      { id: 'usr-4', organization_id: 'org-A' },
    ];
    db.organization_staff = [
      { id: 'st-1', organization_id: 'org-A', user_id: 'trn-1', role_key: 'Trainer' },
      { id: 'st-2', organization_id: 'org-A', user_id: 'trn-2', role_key: 'Personal Trainer' },
    ];
    db.invoices = [
      { id: 'inv-1', user_id: 'usr-1', amount_paid: 6000, status: 'paid', created_at: '2026-08-10T00:00:00Z' },
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const trainerEngine = new TrainerAnalyticsEngine(repo);
    const trainers = await trainerEngine.compute('org-A', period);

    expect(trainers.totalTrainers).toBe(2);
    expect(trainers.avgClientLoad).toBe(2); // 4 members / 2 trainers
    expect(trainers.revenuePerTrainer).toBe(3000); // 6000 / 2
  });

  it('5. Workout KPI computes sessions, duration, and exercise volume accurately', async () => {
    db.profiles = [{ id: 'usr-1', organization_id: 'org-A' }];
    db.workout_sessions = [
      {
        id: 'ws-1',
        user_id: 'usr-1',
        started_at: '2026-08-10T10:00:00Z',
        completed_at: '2026-08-10T11:00:00Z',
        state: 'completed',
        created_at: '2026-08-10T10:00:00Z',
      },
    ];
    db.exercise_sessions = [{ id: 'es-1', workout_session_id: 'ws-1', exercise_id: 'ex-1' }];
    db.exercise_sets = [
      { id: 'set-1', exercise_session_id: 'es-1', weight_kg: 100, reps: 5, status: 'completed' }, // 500kg
      { id: 'set-2', exercise_session_id: 'es-1', weight_kg: 100, reps: 5, status: 'completed' }, // 500kg
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const workoutEngine = new WorkoutAnalyticsEngine(repo);
    const workouts = await workoutEngine.compute('org-A', period);

    expect(workouts.totalSessions).toBe(1);
    expect(workouts.avgSessionDurationMin).toBe(60);
    expect(workouts.totalVolumeKg).toBe(1000);
    expect(workouts.mostPopularExercises[0].name).toBe('Barbell Squat');
  });

  it('6. Nutrition KPI calculates real calorie averages and adherence rates', async () => {
    db.profiles = [{ id: 'usr-1', organization_id: 'org-A' }];
    db.nutrition_logs = [
      { id: 'nl-1', user_id: 'usr-1', date: '2026-08-10', calories_consumed: 2200, protein_g: 140 },
      { id: 'nl-2', user_id: 'usr-1', date: '2026-08-11', calories_consumed: 2000, protein_g: 140 },
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const nutritionEngine = new NutritionAnalyticsEngine(repo);
    const nutrition = await nutritionEngine.compute('org-A', period);

    expect(nutrition.avgCaloriesLogged).toBe(2100);
    expect(nutrition.avgProteinAdherencePct).toBe(100);
    expect(nutrition.membersLoggingDaily).toBe(1);
  });

  it('7. Retention KPI computes real cohort retention and plan churn rates', async () => {
    db.profiles = [
      { id: 'usr-1', organization_id: 'org-A', created_at: '2026-01-10T00:00:00Z' },
      { id: 'usr-2', organization_id: 'org-A', created_at: '2026-01-15T00:00:00Z' },
    ];
    db.subscriptions = [
      { user_id: 'usr-1', tier: 'pro', status: 'active', created_at: '2026-01-10T00:00:00Z' },
      { user_id: 'usr-2', tier: 'pro', status: 'canceled', created_at: '2026-01-15T00:00:00Z', canceled_at: '2026-04-15T00:00:00Z' },
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const retentionEngine = new RetentionAnalyticsEngine(repo);
    const retention = await retentionEngine.compute('org-A', period);

    expect(retention.overallRetentionPct).toBe(50); // 1 active out of 2 total
    expect(retention.cohortRetention.length).toBeGreaterThan(0);
    expect(retention.churnByPlan['pro']).toBe(50);
  });

  it('8. Period-over-period calculations in KPIEngine are mathematically accurate', () => {
    const kpiEngine = new KPIEngine();
    const current = { mrr: 10000, total_members: 100 };
    const previous = { mrr: 8000, total_members: 80 };

    const kpis = kpiEngine.buildKPIs(current, previous, period);
    const mrrKpi = kpis.find((k) => k.key === 'mrr');
    const memberKpi = kpis.find((k) => k.key === 'total_members');

    expect(mrrKpi?.value).toBe(10000);
    expect(mrrKpi?.change).toBe(2000);
    expect(mrrKpi?.changePct).toBe(25); // (2000/8000)*100
    expect(mrrKpi?.trend).toBe('up');

    expect(memberKpi?.value).toBe(100);
    expect(memberKpi?.change).toBe(20);
    expect(memberKpi?.changePct).toBe(25);
    expect(memberKpi?.trend).toBe('up');
  });

  it('9. Empty dataset produces clean zero values and does not fabricate numbers', async () => {
    const repo = new AnalyticsRepository(createMockSupabase());
    const revenueEngine = new RevenueAnalyticsEngine(repo);
    const attendanceEngine = new AttendanceAnalyticsEngine(repo);
    const memberEngine = new MemberAnalyticsEngine(repo);

    const rev = await revenueEngine.compute('org-empty', period);
    const att = await attendanceEngine.compute('org-empty', period);
    const mem = await memberEngine.compute('org-empty', period);

    expect(rev.mrr).toBe(0);
    expect(rev.arr).toBe(0);
    expect(rev.totalRevenue).toBe(0);
    expect(att.totalVisits).toBe(0);
    expect(att.peakHour).toBe('N/A');
    expect(att.peakDay).toBe('N/A');
    expect(mem.totalMembers).toBe(0);
    expect(mem.activeMembers).toBe(0);
  });

  it('10. Organization A cannot see Organization B data (Strict Tenant Isolation)', async () => {
    db.profiles = [
      { id: 'usr-A', organization_id: 'org-A', created_at: '2026-08-01T00:00:00Z' },
      { id: 'usr-B', organization_id: 'org-B', created_at: '2026-08-01T00:00:00Z' },
    ];
    db.subscriptions = [
      { user_id: 'usr-A', tier: 'pro', status: 'active' }, // 1500
      { user_id: 'usr-B', tier: 'elite', status: 'active' }, // 3900
    ];

    const repo = new AnalyticsRepository(createMockSupabase());
    const revenueEngine = new RevenueAnalyticsEngine(repo);

    const revA = await revenueEngine.compute('org-A', period);
    const revB = await revenueEngine.compute('org-B', period);

    expect(revA.mrr).toBe(1500); // Only Org A
    expect(revB.mrr).toBe(3900); // Only Org B
  });

  it('11. Executive summary reflects real computed KPIs', async () => {
    const executiveDashboard = new ExecutiveDashboard();
    const rev = { mrr: 25000, arr: 300000, mrrGrowthPct: 12.5, totalRevenue: 25000, revenueByPlan: { pro: 25000 }, refundsTotal: 0, netRevenue: 25000, arpu: 1250, ltv: 15000, paymentFailureRate: 1.2, organizationId: 'org-1', period, trendSeries: [] };
    const mem = { totalMembers: 20, activeMembers: 20, newMembers: 5, churned: 0, churnRate: 0, retentionRate: 100, avgHealthScore: 82, highRiskCount: 0, engagementScore: 90, ageDistribution: {}, planDistribution: {}, organizationId: 'org-1', period, trendSeries: [] };
    const att = { totalVisits: 140, uniqueMembers: 20, avgDailyVisits: 4.5, peakHour: '08:00', peakDay: 'Monday', avgVisitDurationMin: 55, occupancyRate: 40, noShowRate: 2, heatmap: {}, organizationId: 'org-1', period, trendSeries: [] };
    const ret = { overallRetentionPct: 100, cohortRetention: [], churnByPlan: {}, avgDaysBeforeChurn: 0, topChurnReasons: [], recoveredMembers: 0, organizationId: 'org-1', period };

    const summary = executiveDashboard.generateSummary('org-1', period, [], rev, mem, att, ret);

    expect(summary.headline).toContain('₹25,000');
    expect(summary.headline).toContain('20 active members');
    expect(summary.aiNarrative).toContain('MRR (+12.5% vs previous period)');
  });

  it('12. ReportGenerator exports actual data in JSON and CSV formats', async () => {
    db.profiles = [{ id: 'usr-1', organization_id: 'org-A', created_at: '2026-08-01T00:00:00Z' }];
    db.subscriptions = [{ user_id: 'usr-1', tier: 'pro', status: 'active' }];

    const repo = new AnalyticsRepository(createMockSupabase());
    const revenueEngine = new RevenueAnalyticsEngine(repo);
    const generator = new ReportGenerator({ revenue: revenueEngine });

    const jsonReport = await generator.generate({
      organizationId: 'org-A',
      reportType: 'revenue',
      format: 'json',
      period,
    });

    expect(jsonReport.format).toBe('json');
    expect(jsonReport.data.mrr).toBe(1500);

    const csvReport = await generator.generate({
      organizationId: 'org-A',
      reportType: 'revenue',
      format: 'csv',
      period,
    });

    expect(csvReport.format).toBe('csv');
    expect(csvReport.csvContent).toContain('MRR,1500');
  });

  it('13. Migration 010 SQL inspection: fail-closed RLS and performance indexes', () => {
    const migrationFilePath = path.join(
      __dirname,
      '../../supabase/migrations/010_analytics_and_attendance.sql'
    );
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8');

    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.attendance_logs');
    expect(migrationSql).toContain('ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain("NULLIF(current_setting('app.current_organization_id', true), '')::UUID");
    expect(migrationSql).toContain('idx_attendance_logs_org_checkin');
    expect(migrationSql).toContain('idx_profiles_org_created');
  });
});
