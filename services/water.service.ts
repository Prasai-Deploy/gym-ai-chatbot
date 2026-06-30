/**
 * services/water.service.ts
 * Hydration tracking via Supabase client.
 */
import supabase from "../db.js";
import { updateWeeklyProgress } from "./progress.service.js";

export async function addWaterIntake(userId: number, amount: number, source = "manual") {
  const date = new Date().toISOString().split("T")[0];
  await supabase.from("water_logs").insert({ user_id: userId, intake_amount: amount, source });

  const { data: existing } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const newTotal = (existing.total_consumed || 0) + amount;
    const pct = Math.min(100, Math.round((newTotal / (existing.daily_goal || 2000)) * 100));
    await supabase
      .from("daily_hydration_progress")
      .update({ total_consumed: newTotal, completion_percentage: pct })
      .eq("user_id", userId)
      .eq("date", date);
  } else {
    await supabase
      .from("daily_hydration_progress")
      .insert({ user_id: userId, date, total_consumed: amount });
  }

  const { data: prog } = await supabase
    .from("daily_hydration_progress")
    .select("completion_percentage")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  await updateWeeklyProgress(userId, date, { hydration_completion: prog?.completion_percentage || 0 });
  return { success: true };
}

export async function updateWaterIntake(userId: number, logId: number, amount: number) {
  const { data: old } = await supabase
    .from("water_logs")
    .select("intake_amount")
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle();

  const diff = amount - (old?.intake_amount || 0);
  await supabase.from("water_logs").update({ intake_amount: amount }).eq("id", logId).eq("user_id", userId);

  const date = new Date().toISOString().split("T")[0];
  const { data: prog } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (prog) {
    const newTotal = (prog.total_consumed || 0) + diff;
    const pct = Math.min(100, Math.round((newTotal / (prog.daily_goal || 2000)) * 100));
    await supabase
      .from("daily_hydration_progress")
      .update({ total_consumed: newTotal, completion_percentage: pct })
      .eq("user_id", userId)
      .eq("date", date);
  }
}

export async function deleteWaterIntake(userId: number, logId: number) {
  const { data: old } = await supabase
    .from("water_logs")
    .select("intake_amount")
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle();

  const amount = old?.intake_amount || 0;
  await supabase.from("water_logs").delete().eq("id", logId).eq("user_id", userId);

  const date = new Date().toISOString().split("T")[0];
  const { data: prog } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (prog) {
    const newTotal = Math.max(0, (prog.total_consumed || 0) - amount);
    const pct = Math.min(100, Math.round((newTotal / (prog.daily_goal || 2000)) * 100));
    await supabase
      .from("daily_hydration_progress")
      .update({ total_consumed: newTotal, completion_percentage: pct })
      .eq("user_id", userId)
      .eq("date", date);
  }
}

export async function setHydrationGoal(userId: number, goalMl: number, isAI = false, reason?: string) {
  const date = new Date().toISOString().split("T")[0];
  await supabase.from("water_goals").insert({
    user_id: userId,
    daily_goal: goalMl,
    generated_by_ai: isAI ? 1 : 0,
    goal_reason: reason || null,
  });

  const { data: existing } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const pct = Math.min(100, Math.round(((existing.total_consumed || 0) / goalMl) * 100));
    await supabase
      .from("daily_hydration_progress")
      .update({ daily_goal: goalMl, completion_percentage: pct })
      .eq("user_id", userId)
      .eq("date", date);
  } else {
    await supabase
      .from("daily_hydration_progress")
      .insert({ user_id: userId, date, daily_goal: goalMl });
  }
}

export async function getTodayHydration(userId: number) {
  const date = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data || { user_id: userId, date, total_consumed: 0, daily_goal: 2000, completion_percentage: 0 };
}

export async function getTodayLogs(userId: number) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", today)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getHydrationHistory(userId: number, limit = 7) {
  const { data } = await supabase
    .from("daily_hydration_progress")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  return data || [];
}
