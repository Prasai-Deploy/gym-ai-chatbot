import {
  RevenueAnalytics,
  AttendanceAnalytics,
  MemberAnalytics,
  TrainerAnalytics,
  WorkoutAnalytics,
  NutritionAnalytics,
  RetentionAnalytics,
  DateRange,
} from './analytics.types';
import { AnalyticsRepository, analyticsRepository } from './repositories/AnalyticsRepository';

export class RevenueAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<RevenueAnalytics> {
    const memberIds = await this.repo.getOrgMemberIds(orgId);
    if (memberIds.length === 0) {
      return {
        organizationId: orgId,
        period,
        mrr: 0,
        arr: 0,
        mrrGrowthPct: 0,
        totalRevenue: 0,
        revenueByPlan: { free: 0, pro: 0, elite: 0 },
        refundsTotal: 0,
        netRevenue: 0,
        arpu: 0,
        ltv: 0,
        paymentFailureRate: 0,
        trendSeries: [],
      };
    }

    const subscriptions = await this.repo.getSubscriptionsForUsers(memberIds);
    const invoices = await this.repo.getInvoicesForUsers(memberIds, period);

    let mrr = 0;
    const revenueByPlan: Record<string, number> = { free: 0, pro: 0, elite: 0 };

    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        let monthlyVal = 0;
        if (sub.tier === 'pro') {
          monthlyVal = sub.interval === 'yearly' ? 1250 : 1500;
        } else if (sub.tier === 'elite') {
          monthlyVal = sub.interval === 'yearly' ? 3250 : 3900;
        }
        mrr += monthlyVal;
        revenueByPlan[sub.tier] = (revenueByPlan[sub.tier] || 0) + monthlyVal;
      }
    }

    const arr = mrr * 12;

    let totalRevenue = 0;
    let refundsTotal = 0;
    let failedInvoices = 0;

    for (const inv of invoices) {
      if (inv.status === 'paid') {
        totalRevenue += Number(inv.amount_paid || 0);
      } else if (inv.status === 'void' || inv.status === 'uncollectible') {
        failedInvoices++;
      }
    }

    // If no explicit invoices logged yet in the period, fallback to current MRR
    if (totalRevenue === 0 && mrr > 0) {
      totalRevenue = mrr;
    }

    const netRevenue = Math.max(0, totalRevenue - refundsTotal);
    const activeMembersCount = subscriptions.filter((s) => s.status === 'active').length || memberIds.length;
    const arpu = activeMembersCount > 0 ? Math.round((totalRevenue / activeMembersCount) * 100) / 100 : 0;

    const canceledSubs = subscriptions.filter((s) => s.status === 'canceled').length;
    const churnRate = subscriptions.length > 0 ? (canceledSubs / subscriptions.length) * 100 : 0;
    const ltv = churnRate > 0 ? Math.round(arpu / (churnRate / 100)) : Math.round(arpu * 12);

    const totalInvoiceAttempts = invoices.length;
    const paymentFailureRate = totalInvoiceAttempts > 0
      ? Math.round((failedInvoices / totalInvoiceAttempts) * 1000) / 10
      : 0;

    const trendMap: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === 'paid' && inv.paid_at) {
        const dateKey = inv.paid_at.split('T')[0];
        trendMap[dateKey] = (trendMap[dateKey] || 0) + Number(inv.amount_paid || 0);
      }
    }

    const trendSeries = Object.entries(trendMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      organizationId: orgId,
      period,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      mrrGrowthPct: 0,
      totalRevenue: Math.round(totalRevenue),
      revenueByPlan,
      refundsTotal,
      netRevenue: Math.round(netRevenue),
      arpu,
      ltv,
      paymentFailureRate,
      trendSeries,
    };
  }
}

export class AttendanceAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<AttendanceAnalytics> {
    const memberIds = await this.repo.getOrgMemberIds(orgId);
    let attendanceLogs = await this.repo.getAttendanceLogs(orgId, period);

    // Fallback: If no explicit turnstile check-ins exist, derive from workout_sessions
    if (attendanceLogs.length === 0 && memberIds.length > 0) {
      const workoutSessions = await this.repo.getWorkoutSessionsForUsers(memberIds, period);
      attendanceLogs = workoutSessions.map((ws) => ({
        id: ws.id,
        user_id: ws.user_id,
        check_in_time: ws.started_at || ws.created_at,
        check_out_time: ws.completed_at,
        duration_minutes: ws.started_at && ws.completed_at
          ? Math.round((new Date(ws.completed_at).getTime() - new Date(ws.started_at).getTime()) / 60000)
          : 60,
        status: ws.state === 'cancelled' || ws.state === 'abandoned' ? 'no_show' : 'completed',
      }));
    }

    const totalVisits = attendanceLogs.length;
    if (totalVisits === 0) {
      return {
        organizationId: orgId,
        period,
        totalVisits: 0,
        uniqueMembers: 0,
        avgDailyVisits: 0,
        peakHour: 'N/A',
        peakDay: 'N/A',
        avgVisitDurationMin: 0,
        occupancyRate: 0,
        noShowRate: 0,
        heatmap: {},
        trendSeries: [],
      };
    }

    const uniqueMembers = new Set(attendanceLogs.map((l) => l.user_id)).size;

    const fromDate = new Date(period.from).getTime();
    const toDate = new Date(period.to).getTime();
    const daysInPeriod = Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
    const avgDailyVisits = Math.round((totalVisits / daysInPeriod) * 10) / 10;

    const heatmap: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let totalDuration = 0;
    let durationCount = 0;
    let noShowCount = 0;
    const trendMap: Record<string, number> = {};

    for (const log of attendanceLogs) {
      const checkinDate = new Date(log.check_in_time);
      const dateStr = log.check_in_time.split('T')[0];
      trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;

      const dayIdx = checkinDate.getUTCDay();
      const hour = checkinDate.getUTCHours();
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      const shortHourStr = hour.toString().padStart(2, '0');
      const dayName = dayNames[dayIdx];
      const heatKey = `${shortDayNames[dayIdx]}-${shortHourStr}`;

      heatmap[heatKey] = (heatmap[heatKey] || 0) + 1;
      hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;

      if (log.duration_minutes) {
        totalDuration += log.duration_minutes;
        durationCount++;
      }
      if (log.status === 'no_show' || log.status === 'cancelled') {
        noShowCount++;
      }
    }

    let peakHour = 'N/A';
    let maxHourCount = 0;
    for (const [h, count] of Object.entries(hourCounts)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = h;
      }
    }

    let peakDay = 'N/A';
    let maxDayCount = 0;
    for (const [d, count] of Object.entries(dayCounts)) {
      if (count > maxDayCount) {
        maxDayCount = count;
        peakDay = d;
      }
    }

    const avgVisitDurationMin = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
    const noShowRate = Math.round((noShowCount / totalVisits) * 1000) / 10;
    const occupancyRate = Math.min(100, Math.round((maxHourCount / 200) * 100));

    const trendSeries = Object.entries(trendMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      organizationId: orgId,
      period,
      totalVisits,
      uniqueMembers,
      avgDailyVisits,
      peakHour,
      peakDay,
      avgVisitDurationMin,
      occupancyRate,
      noShowRate,
      heatmap,
      trendSeries,
    };
  }
}

export class MemberAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<MemberAnalytics> {
    const members = await this.repo.getOrgMembers(orgId);
    const totalMembers = members.length;

    if (totalMembers === 0) {
      return {
        organizationId: orgId,
        period,
        totalMembers: 0,
        activeMembers: 0,
        newMembers: 0,
        churned: 0,
        churnRate: 0,
        retentionRate: 0,
        avgHealthScore: 0,
        highRiskCount: 0,
        engagementScore: 0,
        ageDistribution: {},
        planDistribution: {},
        trendSeries: [],
      };
    }

    const memberIds = members.map((m) => m.id);
    const subscriptions = await this.repo.getSubscriptionsForUsers(memberIds);
    const recoveryLogs = await this.repo.getRecoveryLogsForUsers(memberIds, period);

    const fromDate = new Date(period.from);
    const toDate = new Date(period.to + 'T23:59:59.999Z');

    let newMembers = 0;
    const trendMap: Record<string, number> = {};

    for (const m of members) {
      const created = new Date(m.created_at);
      if (created >= fromDate && created <= toDate) {
        newMembers++;
        const dateKey = m.created_at.split('T')[0];
        trendMap[dateKey] = (trendMap[dateKey] || 0) + 1;
      }
    }

    const planDistribution: Record<string, number> = { free: 0, pro: 0, elite: 0 };
    let activeMembers = 0;
    let churned = 0;

    for (const sub of subscriptions) {
      planDistribution[sub.tier] = (planDistribution[sub.tier] || 0) + 1;
      if (sub.status === 'active') {
        activeMembers++;
      } else if (sub.status === 'canceled') {
        churned++;
      }
    }

    if (activeMembers === 0) {
      activeMembers = totalMembers - churned;
    }

    const churnRate = totalMembers > 0 ? Math.round((churned / totalMembers) * 1000) / 10 : 0;
    const retentionRate = Math.max(0, Math.round((100 - churnRate) * 10) / 10);

    let totalScore = 0;
    let scoreCount = 0;
    let highRiskCount = 0;
    const userReadinessMap: Record<string, number[]> = {};

    for (const log of recoveryLogs) {
      if (typeof log.readiness_score === 'number') {
        totalScore += log.readiness_score;
        scoreCount++;
        userReadinessMap[log.user_id] = userReadinessMap[log.user_id] || [];
        userReadinessMap[log.user_id].push(log.readiness_score);
      }
    }

    for (const [, scores] of Object.entries(userReadinessMap)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 40) highRiskCount++;
    }

    const avgHealthScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    const engagementScore = Math.min(100, Math.round((scoreCount / (totalMembers || 1)) * 20 + (retentionRate * 0.8)));

    const trendSeries = Object.entries(trendMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      organizationId: orgId,
      period,
      totalMembers,
      activeMembers,
      newMembers,
      churned,
      churnRate,
      retentionRate,
      avgHealthScore,
      highRiskCount,
      engagementScore,
      ageDistribution: { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 },
      planDistribution,
      trendSeries,
    };
  }
}

export class TrainerAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<TrainerAnalytics> {
    const staff = await this.repo.getOrganizationStaff(orgId);
    const trainers = staff.filter((s) => {
      const r = (s.role_key || '').toLowerCase();
      return r.includes('trainer');
    });

    const totalTrainers = trainers.length;
    if (totalTrainers === 0) {
      return {
        organizationId: orgId,
        period,
        totalTrainers: 0,
        avgClientLoad: 0,
        avgClientHealthScore: 0,
        topPerformers: [],
        sessionCompletionRate: 0,
        revenuePerTrainer: 0,
      };
    }

    const memberIds = await this.repo.getOrgMemberIds(orgId);
    const avgClientLoad = Math.round((memberIds.length / totalTrainers) * 10) / 10;

    const recoveryLogs = await this.repo.getRecoveryLogsForUsers(memberIds, period);
    const avgClientHealthScore = recoveryLogs.length > 0
      ? Math.round(recoveryLogs.reduce((acc, l) => acc + (l.readiness_score || 0), 0) / recoveryLogs.length)
      : 0;

    const workoutSessions = await this.repo.getWorkoutSessionsForUsers(memberIds, period);
    const completedSessions = workoutSessions.filter((s) => s.state === 'completed').length;
    const sessionCompletionRate = workoutSessions.length > 0
      ? Math.round((completedSessions / workoutSessions.length) * 1000) / 10
      : 0;

    const invoices = await this.repo.getInvoicesForUsers(memberIds, period);
    const totalRev = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? Number(inv.amount_paid || 0) : 0), 0);
    const revenuePerTrainer = Math.round(totalRev / totalTrainers);

    const topPerformers = trainers.slice(0, 3).map((t, idx) => ({
      trainerId: t.user_id || t.id,
      name: `Trainer ${idx + 1}`,
      clientCount: Math.round(avgClientLoad),
      avgScore: avgClientHealthScore,
    }));

    return {
      organizationId: orgId,
      period,
      totalTrainers,
      avgClientLoad,
      avgClientHealthScore,
      topPerformers,
      sessionCompletionRate,
      revenuePerTrainer,
    };
  }
}

export class WorkoutAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<WorkoutAnalytics> {
    const memberIds = await this.repo.getOrgMemberIds(orgId);
    if (memberIds.length === 0) {
      return {
        organizationId: orgId,
        period,
        totalSessions: 0,
        avgSessionDurationMin: 0,
        totalVolumeKg: 0,
        mostPopularExercises: [],
        avgCompletionRate: 0,
        injuryRiskFlagged: 0,
        trendSeries: [],
      };
    }

    const workoutSessions = await this.repo.getWorkoutSessionsForUsers(memberIds, period);
    const totalSessions = workoutSessions.length;

    if (totalSessions === 0) {
      return {
        organizationId: orgId,
        period,
        totalSessions: 0,
        avgSessionDurationMin: 0,
        totalVolumeKg: 0,
        mostPopularExercises: [],
        avgCompletionRate: 0,
        injuryRiskFlagged: 0,
        trendSeries: [],
      };
    }

    let totalDuration = 0;
    let completedSessions = 0;
    const trendMap: Record<string, number> = {};

    for (const ws of workoutSessions) {
      if (ws.started_at && ws.completed_at) {
        const dur = (new Date(ws.completed_at).getTime() - new Date(ws.started_at).getTime()) / 60000;
        totalDuration += Math.max(0, dur);
      }
      if (ws.state === 'completed') {
        completedSessions++;
      }
      const dateKey = (ws.started_at || ws.created_at).split('T')[0];
      trendMap[dateKey] = (trendMap[dateKey] || 0) + 1;
    }

    const avgSessionDurationMin = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgCompletionRate = Math.round((completedSessions / totalSessions) * 1000) / 10;

    const sessionIds = workoutSessions.map((s) => s.id);
    const sets = await this.repo.getExerciseSetsForSessions(sessionIds);
    const exercises = await this.repo.getExercises();

    let totalVolumeKg = 0;
    const exerciseCountMap: Record<string, number> = {};

    for (const s of sets) {
      if (s.weight_kg && s.reps) {
        totalVolumeKg += Number(s.weight_kg) * Number(s.reps);
      }
      if (s.exercise_id) {
        exerciseCountMap[s.exercise_id] = (exerciseCountMap[s.exercise_id] || 0) + 1;
      }
    }

    const mostPopularExercises = Object.entries(exerciseCountMap)
      .map(([id, count]) => {
        const ex = exercises.find((e) => e.id === id);
        return { name: ex ? ex.name : `Exercise ${id.slice(0, 6)}`, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const trendSeries = Object.entries(trendMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      organizationId: orgId,
      period,
      totalSessions,
      avgSessionDurationMin,
      totalVolumeKg: Math.round(totalVolumeKg),
      mostPopularExercises,
      avgCompletionRate,
      injuryRiskFlagged: 0,
      trendSeries,
    };
  }
}

export class NutritionAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<NutritionAnalytics> {
    const memberIds = await this.repo.getOrgMemberIds(orgId);
    if (memberIds.length === 0) {
      return {
        organizationId: orgId,
        period,
        avgCaloriesLogged: 0,
        avgProteinAdherencePct: 0,
        avgMacroScore: 0,
        membersLoggingDaily: 0,
        loggingAdherencePct: 0,
        topDeficitDay: 'N/A',
      };
    }

    const logs = await this.repo.getNutritionLogsForUsers(memberIds, period);
    if (logs.length === 0) {
      return {
        organizationId: orgId,
        period,
        avgCaloriesLogged: 0,
        avgProteinAdherencePct: 0,
        avgMacroScore: 0,
        membersLoggingDaily: 0,
        loggingAdherencePct: 0,
        topDeficitDay: 'N/A',
      };
    }

    let totalCalories = 0;
    let totalProtein = 0;
    const dayCaloriesMap: Record<string, { total: number; count: number }> = {};
    const dateUserMap: Record<string, Set<string>> = {};

    for (const log of logs) {
      const cals = log.calories_consumed || 0;
      const protein = log.protein_g || 0;
      totalCalories += cals;
      totalProtein += protein;

      const dateStr = log.date;
      dateUserMap[dateStr] = dateUserMap[dateStr] || new Set();
      dateUserMap[dateStr].add(log.user_id);

      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
      dayCaloriesMap[dayName] = dayCaloriesMap[dayName] || { total: 0, count: 0 };
      dayCaloriesMap[dayName].total += cals;
      dayCaloriesMap[dayName].count += 1;
    }

    const avgCaloriesLogged = Math.round(totalCalories / logs.length);
    const avgProteinAdherencePct = Math.min(100, Math.round((totalProtein / logs.length / 140) * 1000) / 10);
    const avgMacroScore = Math.min(100, Math.round((avgProteinAdherencePct * 0.6) + 40));

    const activeLoggerCounts = Object.values(dateUserMap).map((s) => s.size);
    const membersLoggingDaily = activeLoggerCounts.length > 0
      ? Math.round(activeLoggerCounts.reduce((a, b) => a + b, 0) / activeLoggerCounts.length)
      : 0;

    const fromDate = new Date(period.from).getTime();
    const toDate = new Date(period.to).getTime();
    const daysInPeriod = Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
    const loggingAdherencePct = Math.min(
      100,
      Math.round((logs.length / (memberIds.length * daysInPeriod)) * 1000) / 10
    );

    let topDeficitDay = 'N/A';
    let minAvgCals = Infinity;
    for (const [d, stats] of Object.entries(dayCaloriesMap)) {
      const avg = stats.total / stats.count;
      if (avg < minAvgCals) {
        minAvgCals = avg;
        topDeficitDay = d;
      }
    }

    return {
      organizationId: orgId,
      period,
      avgCaloriesLogged,
      avgProteinAdherencePct,
      avgMacroScore,
      membersLoggingDaily,
      loggingAdherencePct,
      topDeficitDay,
    };
  }
}

export class RetentionAnalyticsEngine {
  constructor(private readonly repo: AnalyticsRepository = analyticsRepository) {}

  public async compute(orgId: string, period: DateRange): Promise<RetentionAnalytics> {
    const members = await this.repo.getOrgMembers(orgId);
    const totalMembers = members.length;

    if (totalMembers === 0) {
      return {
        organizationId: orgId,
        period,
        overallRetentionPct: 0,
        cohortRetention: [],
        churnByPlan: {},
        avgDaysBeforeChurn: 0,
        topChurnReasons: [],
        recoveredMembers: 0,
      };
    }

    const memberIds = members.map((m) => m.id);
    const subscriptions = await this.repo.getSubscriptionsForUsers(memberIds);

    let churnedCount = 0;
    let totalChurnDays = 0;
    const churnByPlan: Record<string, { total: number; churned: number }> = {};

    for (const sub of subscriptions) {
      churnByPlan[sub.tier] = churnByPlan[sub.tier] || { total: 0, churned: 0 };
      churnByPlan[sub.tier].total += 1;

      if (sub.status === 'canceled') {
        churnedCount++;
        churnByPlan[sub.tier].churned += 1;

        if (sub.created_at && sub.canceled_at) {
          const days = (new Date(sub.canceled_at).getTime() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24);
          totalChurnDays += Math.max(1, Math.round(days));
        }
      }
    }

    const overallRetentionPct = Math.max(0, Math.round(((totalMembers - churnedCount) / totalMembers) * 1000) / 10);
    const avgDaysBeforeChurn = churnedCount > 0 ? Math.round(totalChurnDays / churnedCount) : 0;

    const planChurnRates: Record<string, number> = {};
    for (const [tier, counts] of Object.entries(churnByPlan)) {
      planChurnRates[tier] = counts.total > 0 ? Math.round((counts.churned / counts.total) * 1000) / 10 : 0;
    }

    const cohortGroups: Record<string, any[]> = {};
    for (const m of members) {
      const dt = new Date(m.created_at);
      const year = dt.getUTCFullYear();
      const q = Math.floor(dt.getUTCMonth() / 3) + 1;
      const cohortKey = `${year}-Q${q}`;
      cohortGroups[cohortKey] = cohortGroups[cohortKey] || [];
      cohortGroups[cohortKey].push(m);
    }

    const now = Date.now();
    const cohortRetention = Object.entries(cohortGroups)
      .map(([cohort, list]) => {
        const cohortSize = list.length;
        const calcRet = (monthThreshold: number) => {
          const valid = list.filter((m) => {
            const ageDays = (now - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays < monthThreshold * 30) return false;
            const sub = subscriptions.find((s) => s.user_id === m.id);
            return !sub || sub.status !== 'canceled';
          }).length;
          return cohortSize > 0 ? Math.round((valid / cohortSize) * 100) : 0;
        };

        return {
          cohort,
          month1: calcRet(1),
          month3: calcRet(3),
          month6: calcRet(6),
          month12: calcRet(12),
        };
      })
      .sort((a, b) => b.cohort.localeCompare(a.cohort));

    return {
      organizationId: orgId,
      period,
      overallRetentionPct,
      cohortRetention,
      churnByPlan: planChurnRates,
      avgDaysBeforeChurn,
      topChurnReasons: ['Inactivity', 'Billing Failure', 'Schedule Conflict', 'Relocation'],
      recoveredMembers: 0,
    };
  }
}

export const revenueAnalytics    = new RevenueAnalyticsEngine();
export const attendanceAnalytics = new AttendanceAnalyticsEngine();
export const memberAnalytics     = new MemberAnalyticsEngine();
export const trainerAnalytics    = new TrainerAnalyticsEngine();
export const workoutAnalytics    = new WorkoutAnalyticsEngine();
export const nutritionAnalytics  = new NutritionAnalyticsEngine();
export const retentionAnalytics  = new RetentionAnalyticsEngine();
