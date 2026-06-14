import supabase from "../db.js";

/** Upserts daily activity metrics into the weekly_progress table. */
export async function updateWeeklyProgress(userId, date, data) {
    const { data: existing } = await supabase.from("weekly_progress").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
    if (existing) {
        await supabase.from("weekly_progress").update({
            workouts_completed: (existing.workouts_completed || 0) + (data.workouts_completed || 0),
            exercises_completed: (existing.exercises_completed || 0) + (data.exercises_completed || 0),
            calories_burned: (existing.calories_burned || 0) + (data.calories_burned || 0),
            workout_duration: (existing.workout_duration || 0) + (data.workout_duration || 0),
            hydration_completion: Math.max(existing.hydration_completion || 0, data.hydration_completion || 0),
            diet_completion: Math.max(existing.diet_completion || 0, data.diet_completion || 0),
            streak_value: Math.max(existing.streak_value || 0, data.streak_value || 0),
        }).eq("user_id", userId).eq("date", date);
    } else {
        await supabase.from("weekly_progress").insert({
            user_id: userId, date,
            workouts_completed: data.workouts_completed || 0,
            exercises_completed: data.exercises_completed || 0,
            calories_burned: data.calories_burned || 0,
            workout_duration: data.workout_duration || 0,
            hydration_completion: data.hydration_completion || 0,
            diet_completion: data.diet_completion || 0,
            streak_value: data.streak_value || 0,
        });
    }
    await updateDailyFitnessStats(userId, {
        daily_progress_percentage: data.hydration_completion || 0,
        active_minutes: data.workout_duration || 0,
        completed_goals: data.workouts_completed || 0,
    });
}

export async function updateDailyFitnessStats(userId, data) {
    const { data: existing } = await supabase.from("daily_fitness_stats").select("*").eq("user_id", userId).maybeSingle();
    if (existing) {
        await supabase.from("daily_fitness_stats").update({
            daily_progress_percentage: Math.max(existing.daily_progress_percentage || 0, data.daily_progress_percentage || 0),
            active_minutes: (existing.active_minutes || 0) + (data.active_minutes || 0),
            completed_goals: (existing.completed_goals || 0) + (data.completed_goals || 0),
        }).eq("user_id", userId);
    } else {
        await supabase.from("daily_fitness_stats").insert({
            user_id: userId,
            daily_progress_percentage: data.daily_progress_percentage || 0,
            active_minutes: data.active_minutes || 0,
            completed_goals: data.completed_goals || 0,
        });
    }
}

export async function getWeeklyChartData(userId) {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data } = await supabase.from("weekly_progress").select("date, workouts_completed, exercises_completed, calories_burned, workout_duration, hydration_completion, diet_completion")
        .eq("user_id", userId).gte("date", weekAgo.toISOString().split("T")[0]).order("date", { ascending: true });
    return data || [];
}

export async function getWeeklySummary(userId) {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: rows } = await supabase.from("weekly_progress").select("*").eq("user_id", userId).gte("date", weekAgo.toISOString().split("T")[0]);
    if (!rows || rows.length === 0) return null;
    return {
        total_workouts: rows.reduce((s, r) => s + (r.workouts_completed || 0), 0),
        total_exercises: rows.reduce((s, r) => s + (r.exercises_completed || 0), 0),
        total_calories: rows.reduce((s, r) => s + (r.calories_burned || 0), 0),
        total_duration: rows.reduce((s, r) => s + (r.workout_duration || 0), 0),
        avg_hydration: rows.reduce((s, r) => s + (r.hydration_completion || 0), 0) / rows.length,
        avg_diet: rows.reduce((s, r) => s + (r.diet_completion || 0), 0) / rows.length,
        best_streak: Math.max(...rows.map((r) => r.streak_value || 0)),
    };
}

export async function getDailyStats(userId) {
    const { data } = await supabase.from("daily_fitness_stats").select("*").eq("user_id", userId).maybeSingle();
    return data || { daily_progress_percentage: 0, active_minutes: 0, completed_goals: 0 };
}

export async function logManualProgress(userId, data) {
    const date = new Date().toISOString().split('T')[0];
    await updateWeeklyProgress(userId, date, {
        calories_burned: data.calories || 0,
        hydration_completion: data.water ? Math.min(100, Math.round((data.water / 2000) * 100)) : 0,
    });
    const { data: existing } = await supabase.from("user_progress").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
    if (existing) {
        await supabase.from("user_progress").update({
            calories_burned: (existing.calories_burned || 0) + (data.calories || 0),
            water_ml: (existing.water_ml || 0) + (data.water || 0),
        }).eq("user_id", userId).eq("date", date);
    } else {
        await supabase.from("user_progress").insert({
            user_id: userId, date, calories_consumed: 0, calories_burned: data.calories || 0, water_ml: data.water || 0,
        });
    }
    return { success: true };
}

export async function buildProgressInsight(userId) {
    const summary = await getWeeklySummary(userId);
    if (!summary || !summary.total_workouts) return "User has no recorded activity this week.";
    return `Weekly Summary:
- Total Workouts: ${summary.total_workouts}
- Total Calories Burned: ${summary.total_calories} kcal
- Total Active Minutes: ${summary.total_duration}
- Hydration Success: ${Math.round(summary.avg_hydration)}%
- Diet Consistency: ${Math.round(summary.avg_diet)}%
- Best Streak: ${summary.best_streak} days`;
}
