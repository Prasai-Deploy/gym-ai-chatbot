/**
 * services/dashboard.service.ts
 * Dashboard summary and metrics logging via Supabase.
 */
import supabase from "../db.js";
import { getWeeklyChartData, getWeeklySummary, getDailyStats } from "./progress.service.js";
import { getLatestActivePlan } from "./plan.service.js";
import { getTodayHydration } from "./water.service.js";

export interface MetricsPayload {
  date?: string;
  weight_kg?: number;
  body_fat_pct?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  notes?: string;
}

export async function buildDashboardSummary(userId: number) {
  const [
    profile,
    weeklyChart,
    weeklySummary,
    dailyStats,
    activePlan,
    hydration,
    recentProgress,
    recentMeals,
    activityLogs,
  ] = await Promise.allSettled([
    supabase.from("fitness_profiles").select("*").eq("user_id", userId).maybeSingle().then(r => r.data),
    getWeeklyChartData(userId),
    getWeeklySummary(userId),
    getDailyStats(userId),
    getLatestActivePlan(userId),
    getTodayHydration(userId),
    supabase.from("user_progress").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7).then(r => r.data || []),
    supabase.from("user_meal_tracking").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10).then(r => r.data || []),
    supabase.from("activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(15).then(r => r.data || []),
  ]);

  return {
    profile:        profile.status === "fulfilled" ? profile.value : null,
    weeklyChart:    weeklyChart.status === "fulfilled" ? weeklyChart.value : [],
    weeklySummary:  weeklySummary.status === "fulfilled" ? weeklySummary.value : null,
    dailyStats:     dailyStats.status === "fulfilled" ? dailyStats.value : null,
    activePlan:     activePlan.status === "fulfilled" ? activePlan.value : null,
    hydration:      hydration.status === "fulfilled" ? hydration.value : null,
    recentProgress: recentProgress.status === "fulfilled" ? recentProgress.value : [],
    recentMeals:    recentMeals.status === "fulfilled" ? recentMeals.value : [],
    activityLogs:   activityLogs.status === "fulfilled" ? activityLogs.value : [],
  };
}

export function buildChatInsight(data: any): string {
  const parts: string[] = ["📊 **Your Progress Overview**\n"];

  if (data.weeklySummary) {
    const s = data.weeklySummary;
    parts.push(`🏋️ **This Week:**`);
    parts.push(`- Workouts completed: **${s.total_workouts}**`);
    parts.push(`- Calories burned: **${s.total_calories} kcal**`);
    parts.push(`- Active minutes: **${s.total_duration} min**`);
    parts.push(`- Hydration avg: **${Math.round(s.avg_hydration)}%**`);
    parts.push(`- Diet consistency: **${Math.round(s.avg_diet)}%**`);
  }

  if (data.hydration) {
    const h = data.hydration;
    parts.push(`\n💧 **Today's Hydration:** ${h.total_consumed}ml / ${h.daily_goal}ml (${h.completion_percentage}%)`);
  }

  if (data.dailyStats) {
    const d = data.dailyStats;
    parts.push(`\n📈 **Daily Progress:** ${d.daily_progress_percentage}% | Active: ${d.active_minutes} min`);
  }

  return parts.join("\n");
}

export async function logMetrics(userId: number, payload: MetricsPayload) {
  const date = payload.date || new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("progress_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  const metricsData: any = {
    user_id: userId,
    date,
    ...(payload.weight_kg    !== undefined && { weight_kg:    payload.weight_kg }),
    ...(payload.body_fat_pct !== undefined && { body_fat_pct: payload.body_fat_pct }),
    ...(payload.chest_cm     !== undefined && { chest_cm:     payload.chest_cm }),
    ...(payload.waist_cm     !== undefined && { waist_cm:     payload.waist_cm }),
    ...(payload.hips_cm      !== undefined && { hips_cm:      payload.hips_cm }),
    ...(payload.notes        !== undefined && { notes:        payload.notes }),
  };

  if (existing) {
    await supabase.from("progress_logs").update(metricsData).eq("id", existing.id);
  } else {
    await supabase.from("progress_logs").insert(metricsData);
  }

  // Also update fitness_profiles weight if provided
  if (payload.weight_kg !== undefined) {
    await supabase
      .from("fitness_profiles")
      .upsert({ user_id: userId, weight_kg: payload.weight_kg }, { onConflict: "user_id" });
  }
}
