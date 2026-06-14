/**
 * services/workout.service.ts
 * Data-access layer for workout_plans and workout_logs tables via Supabase.
 */
import supabase from "../db.js";

/** Fetch the most recent workout plan for a user. */
export async function getLatestPlan(userId) {
    const { data } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
    return data ?? null;
}

/** Fetch the workout plan for a specific date. */
export async function getPlanByDate(userId, date) {
    const { data } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
    return data ?? null;
}

/** Save (upsert) a generated workout plan. */
export async function savePlan(userId, date, plan, rawPrompt) {
    const exercisesJson = JSON.stringify(plan.exercises);
    await supabase.from("workout_plans").upsert({
        user_id: userId,
        date,
        focus: plan.focus,
        duration: plan.duration,
        exercises: exercisesJson,
        raw_prompt: rawPrompt,
    }, { onConflict: "user_id,date" });
    return getPlanByDate(userId, date);
}

/** Return the most recent log entry for a specific exercise. */
export async function getLastLog(userId, exerciseName) {
    const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName)
        .order("date", { ascending: false })
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    return data ?? null;
}

/** Return the focus for the last N days of workout_plans. */
export async function getRecentFocuses(userId, days = 4) {
    const { data } = await supabase
        .from("workout_plans")
        .select("focus")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(days);
    return (data || []).map((r) => r.focus).filter(Boolean);
}

/** Bulk-insert completed exercise logs for a session. */
export async function saveLogs(userId, planId, date, exercises) {
    if (exercises.length === 0) return;
    const rows = exercises.map((ex) => ({
        user_id: userId,
        plan_id: planId ?? null,
        date,
        exercise_name: ex.exercise_name,
        sets_done: ex.sets_done ?? null,
        reps_done: ex.reps_done ?? null,
        weight_used: ex.weight_used ?? null,
        difficulty: ex.difficulty ?? null,
        notes: ex.notes ?? null,
    }));
    await supabase.from("workout_logs").insert(rows);
}
