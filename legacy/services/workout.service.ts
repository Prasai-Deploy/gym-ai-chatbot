/**
 * services/workout.service.ts
 * Workout plan and log management via Supabase.
 */
import supabase from "../db.js";

export interface WorkoutLogEntry {
  exercise_name: string;
  sets_done?: number;
  reps_done?: string | number;
  weight_used?: number;
  difficulty?: string | number;
}

export async function getPlanByDate(userId: number, date: string) {
  const { data } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data;
}

export async function getLatestPlan(userId: number) {
  const { data } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function savePlan(userId: number, date: string, plan: any, prompt?: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      date: date,
      focus: plan.title || `Workout – ${date}`,
      exercises: typeof plan.exercises === "string" ? JSON.parse(plan.exercises) : (plan.exercises || []),
      duration: plan.duration || "45 min",
      difficulty: plan.difficulty || "Moderate",
      calories_estimate: plan.calories_estimate || 0,
      raw_prompt: prompt || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to save workout plan");
  }
  return data;
}

export async function saveLogs(userId: number, planId: number | null, date: string, logs: WorkoutLogEntry[]) {
  const rows = logs.map((log) => ({
    user_id: userId,
    plan_id: planId,
    date,
    exercise_name: log.exercise_name,
    sets_done: log.sets_done || null,
    reps_done: log.reps_done !== undefined ? String(log.reps_done) : null,
    weight_used: log.weight_used || null,
    difficulty: log.difficulty !== undefined ? Number(log.difficulty) : null,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("workout_logs").insert(rows);
    if (error) throw error;
  }
}

export async function getLastLog(userId: number, exerciseName: string) {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("exercise_name", exerciseName)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getRecentFocuses(userId: number, limit = 4) {
  const { data } = await supabase
    .from("workout_plans")
    .select("focus, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []).map((d) => d.focus || "");
}

export async function saveToChatbotLog(userId: number, plan: any) {
  const formattedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date());
  try {
    await supabase.from("daily_plans").upsert({
      user_id: userId,
      date: formattedDate,
      workout_plan: plan.title || "Workout Plan",
      diet_plan: "",
      completed: 0,
    }, { onConflict: "user_id,date" });
  } catch { /* non-fatal */ }
}

export async function startSession(userId: number, workoutPlanId: number) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      plan_id: workoutPlanId,
      status: "active",
      start_time: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to start workout session");
  }
  return data;
}

export async function updateSessionProgress(
  sessionId: number,
  completedExercises: any[],
  progressPercentage: number,
  caloriesBurned: number
) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      completed_exercises: completedExercises,
      progress_percentage: progressPercentage,
      calories_burned: caloriesBurned,
    })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function completeSession(sessionId: number, stats?: any) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      end_time: new Date().toISOString(),
      ...(stats || {}),
    })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function getTodaySession(userId: number) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", today)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getWorkoutHistory(userId: number, limit = 10) {
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, workout_plans(focus, difficulty)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(limit);
  return data || [];
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string | number;
  rest?: string;
  notes?: string;
}

export interface WorkoutPlan {
  id?: number;
  user_id?: number;
  date?: string;
  focus?: string;
  duration?: string | number;
  exercises: Exercise[];
  calories_estimate?: number;
  difficulty?: string;
  raw_prompt?: string;
  created_at?: string;
}
