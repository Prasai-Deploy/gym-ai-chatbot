/**
 * services/dashboard.service.ts
 * Pure calculation layer for the progress dashboard.
 * No HTTP, no AI — only DB queries and data crunching.
 */
import pool from "../db.js";
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function dbAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
async function dbRun(sql, params = []) {
    await pool.execute(sql, params);
}
// ─────────────────────────────────────────────────────────────────────────────
// Weight progress (from progress_logs + baseline from fitness_profiles)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns up to `days` weight entries ordered oldest → newest.
 * Falls back to the profile's weight_kg as a starting point if logs are empty.
 */
export async function getWeightProgress(userId, days = 90) {
    const rows = await dbAll(`SELECT date, weight_kg
     FROM progress_logs
     WHERE user_id = ? AND weight_kg IS NOT NULL
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date ASC`, [userId, days]);
    // If no body-weight logs yet, seed with profile weight_kg
    if (rows.length === 0) {
        const [profileRows] = await pool.execute(`SELECT weight_kg, updated_at FROM fitness_profiles WHERE user_id = ?`, [userId]);
        const profile = profileRows[0];
        if (profile?.weight_kg) {
            const seedDate = profile.updated_at
                .toISOString()
                .split("T")[0];
            return [{ date: seedDate, weight_kg: Number(profile.weight_kg) }];
        }
        return [];
    }
    return rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : r.date,
        weight_kg: Number(r.weight_kg),
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Streak computation (pure JS, single DB query)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fetches all distinct workout dates (from workout_plans AND progress table)
 * for the past 365 days and computes current + longest streak.
 * Also upserts the result into user_stats for fast future reads.
 */
export async function computeStreakAndStats(userId) {
    // Collect distinct workout dates from both sources
    const rows = await dbAll(`SELECT DISTINCT date FROM (
       SELECT date FROM workout_plans
       WHERE user_id = ? AND date <= CURDATE()
         AND date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       UNION
       SELECT date FROM progress
       WHERE user_id = ? AND workout_name IS NOT NULL AND workout_name != ''
         AND date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
     ) AS combined
     ORDER BY date DESC`, [userId, userId]);
    const dateSet = new Set(rows.map((r) => r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date)));
    const totalWorkouts = dateSet.size;
    // Walk backward from today to compute streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    // Get sorted unique dates (newest first)
    const sortedDates = Array.from(dateSet).sort((a, b) => (a > b ? -1 : 1));
    if (sortedDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const todayStr = today.toISOString().split("T")[0];
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        // Current streak: must start from today or yesterday
        const streakStarted = dateSet.has(todayStr) || dateSet.has(yesterdayStr);
        if (streakStarted) {
            let cursor = dateSet.has(todayStr) ? new Date(today) : new Date(yesterday);
            while (dateSet.has(cursor.toISOString().split("T")[0])) {
                currentStreak++;
                cursor.setDate(cursor.getDate() - 1);
            }
        }
        // Longest streak: walk all dates
        let prevDate = null;
        for (const d of sortedDates) {
            const curr = new Date(d);
            if (prevDate !== null) {
                const diff = Math.round((prevDate.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    runningStreak++;
                }
                else {
                    runningStreak = 1;
                }
            }
            else {
                runningStreak = 1;
            }
            longestStreak = Math.max(longestStreak, runningStreak);
            prevDate = curr;
        }
    }
    const lastWorkoutDate = sortedDates[0] ?? null;
    // Weekly workout count
    const weeklyRows = await dbAll(`SELECT COUNT(DISTINCT date) AS cnt FROM (
       SELECT date FROM workout_plans
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       UNION
       SELECT date FROM progress
       WHERE user_id = ? AND workout_name IS NOT NULL AND workout_name != ''
         AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     ) AS w`, [userId, userId]);
    const weeklyWorkouts = Number(weeklyRows[0]?.cnt ?? 0);
    // Upsert into user_stats cache
    await dbRun(`INSERT INTO user_stats
       (user_id, total_workouts, current_streak, longest_streak, last_workout_date)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_workouts    = VALUES(total_workouts),
       current_streak    = VALUES(current_streak),
       longest_streak    = VALUES(longest_streak),
       last_workout_date = VALUES(last_workout_date)`, [userId, totalWorkouts, currentStreak, longestStreak, lastWorkoutDate]);
    return {
        total_workouts: totalWorkouts,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        weekly_workouts: weeklyWorkouts,
        last_workout_date: lastWorkoutDate,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Strength progress (from workout_logs)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the weight history for the top N most-logged exercises.
 * Only includes exercises that have at least 2 data points.
 */
export async function getStrengthProgress(userId, topN = 5) {
    // Find the exercises with the most entries
    const topExercises = await dbAll(`SELECT exercise_name, COUNT(*) AS cnt
     FROM workout_logs
     WHERE user_id = ? AND weight_used IS NOT NULL AND weight_used > 0
     GROUP BY exercise_name
     HAVING cnt >= 2
     ORDER BY cnt DESC
     LIMIT ?`, [userId, topN]);
    if (topExercises.length === 0)
        return [];
    const exerciseNames = topExercises.map((r) => r.exercise_name);
    // Fetch history for each exercise in one query, ordered oldest → newest
    const history = await dbAll(`SELECT exercise_name, date, AVG(weight_used) AS weight_kg
     FROM workout_logs
     WHERE user_id = ? AND exercise_name IN (${exerciseNames.map(() => "?").join(",")})
       AND weight_used IS NOT NULL AND weight_used > 0
     GROUP BY exercise_name, date
     ORDER BY exercise_name, date ASC`, [userId, ...exerciseNames]);
    // Group by exercise
    const grouped = new Map();
    for (const row of history) {
        const dateStr = row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date);
        if (!grouped.has(row.exercise_name))
            grouped.set(row.exercise_name, []);
        grouped.get(row.exercise_name).push({
            date: dateStr,
            weight_kg: Number(row.weight_kg),
        });
    }
    return exerciseNames
        .filter((name) => grouped.has(name))
        .map((name) => ({
        exercise: name,
        history: grouped.get(name),
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Most improved exercise
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Finds the exercise with the highest % weight increase
 * comparing the first ever log vs the most recent log.
 */
export async function getMostImproved(userId) {
    const rows = await dbAll(`SELECT exercise_name,
            MIN(weight_used) AS first_weight,
            MAX(weight_used) AS latest_weight
     FROM workout_logs
     WHERE user_id = ? AND weight_used IS NOT NULL AND weight_used > 0
     GROUP BY exercise_name
     HAVING COUNT(*) >= 2 AND MAX(weight_used) > MIN(weight_used)
     ORDER BY ((MAX(weight_used) - MIN(weight_used)) / MIN(weight_used)) DESC
     LIMIT 1`, [userId]);
    if (rows.length === 0)
        return null;
    const r = rows[0];
    const first = Number(r.first_weight);
    const latest = Number(r.latest_weight);
    return {
        exercise: r.exercise_name,
        first_weight: first,
        latest_weight: latest,
        improvement_pct: Math.round(((latest - first) / first) * 100 * 10) / 10,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Recent workouts
// ─────────────────────────────────────────────────────────────────────────────
export async function getRecentWorkouts(userId, limit = 7) {
    const rows = await dbAll(`SELECT date, focus FROM workout_plans
     WHERE user_id = ?
     ORDER BY date DESC
     LIMIT ?`, [userId, limit]);
    return rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
        focus: r.focus ?? "Workout",
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Master aggregator
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Builds the full dashboard payload in parallel.
 * This is the single function controllers and the chat trigger call.
 */
export async function buildDashboardSummary(userId) {
    const today = new Date().toISOString().split("T")[0];
    const [weightProgress, stats, strengthProgress, mostImproved, recentWorkouts, todayStatsRows, activePlanRows, workoutPlanRows, legacyPlanRows] = await Promise.all([
        getWeightProgress(userId),
        computeStreakAndStats(userId),
        getStrengthProgress(userId),
        getMostImproved(userId),
        getRecentWorkouts(userId),
        pool.execute(`SELECT * FROM user_progress WHERE user_id = ? AND date = ?`, [userId, today]),
        pool.execute(`SELECT ufp.*, 
                cgw.title as workout_title, cgw.exercises as workout_exercises, cgw.duration, cgw.difficulty, cgw.calories_estimate,
                cgd.title as diet_title, cgd.meals as diet_meals, cgd.calories_target, cgd.protein, cgd.carbs, cgd.fats
         FROM user_fitness_plans ufp
         LEFT JOIN chatbot_generated_workouts cgw ON ufp.workout_plan_id = cgw.id
         LEFT JOIN chatbot_generated_diets cgd ON ufp.diet_plan_id = cgd.id
         WHERE ufp.user_id = ? AND ufp.active = 1
         ORDER BY ufp.created_at DESC LIMIT 1`, [userId]),
        // Also check workout_plans table (has structured exercises from both direct-generation and our new parser fix)
        pool.execute(`SELECT * FROM workout_plans WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 1`, [userId]),
        // Legacy daily_plans table — has the raw markdown strings
        pool.execute(`SELECT * FROM daily_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId])
    ]);
    const todayStats = todayStatsRows[0][0] || null;
    const activePlan = activePlanRows[0][0] || null;
    const workoutPlanRow = workoutPlanRows[0][0] || null;
    const legacyPlan = legacyPlanRows[0][0] || null;
    if (activePlan) {
        if (activePlan.workout_exercises) {
            try {
                activePlan.workout_exercises = typeof activePlan.workout_exercises === 'string'
                    ? JSON.parse(activePlan.workout_exercises)
                    : activePlan.workout_exercises;
            }
            catch {
                activePlan.workout_exercises = null;
            }
        }
        if (activePlan.diet_meals) {
            try {
                activePlan.diet_meals = typeof activePlan.diet_meals === 'string'
                    ? JSON.parse(activePlan.diet_meals)
                    : activePlan.diet_meals;
            }
            catch {
                activePlan.diet_meals = null;
            }
        }
    }
    // ── Build today_plan with multi-source fallback ──────────────────────────────
    // Priority: chatbot_generated_workouts (structured) > workout_plans > daily_plans (markdown)
    let todayPlan = null;
    // Check if structured chatbot plan has valid exercises (not the legacy garbage rows)
    const hasValidChatbotExercises = activePlan?.workout_exercises &&
        Array.isArray(activePlan.workout_exercises) &&
        activePlan.workout_exercises.length > 0 &&
        activePlan.workout_exercises.some((e) => e.sets || e.reps); // real structured data has sets/reps
    const hasValidDietMeals = activePlan?.diet_meals &&
        Array.isArray(activePlan.diet_meals) &&
        activePlan.diet_meals.length > 0;
    if (activePlan && (hasValidChatbotExercises || activePlan.workout_title || hasValidDietMeals || activePlan.diet_title)) {
        // Use chatbot plan — but fall back to workout_plans for exercises if chatbot exercises are garbage
        let exercises = hasValidChatbotExercises ? activePlan.workout_exercises : null;
        // If chatbot exercises are garbage/missing, try workout_plans table
        if (!exercises && workoutPlanRow) {
            try {
                const wpExercises = typeof workoutPlanRow.exercises === 'string'
                    ? JSON.parse(workoutPlanRow.exercises)
                    : workoutPlanRow.exercises;
                if (Array.isArray(wpExercises) && wpExercises.length > 0 && wpExercises[0].name !== 'Workout') {
                    exercises = wpExercises;
                }
            }
            catch { }
        }
        // Build meals: filter out the legacy markdown blob meal
        let meals = hasValidDietMeals
            ? activePlan.diet_meals.filter((m) => !(m.type === 'Full Day' && Array.isArray(m.items) && m.items.length === 1 && typeof m.items[0] === 'string' && m.items[0].length > 200))
            : null;
        if (meals && meals.length === 0)
            meals = null;
        todayPlan = {
            workout_title: workoutPlanRow?.focus || activePlan.workout_title || 'Today\'s Workout',
            diet_title: activePlan.diet_title,
            workout_exercises: exercises,
            diet_meals: meals,
            calories_target: activePlan.calories_target,
            protein_goal: activePlan.protein,
            carb_goal: activePlan.carbs,
            fat_goal: activePlan.fats,
            duration: workoutPlanRow?.duration || activePlan.duration,
            difficulty: workoutPlanRow?.difficulty || activePlan.difficulty,
        };
    }
    else if (workoutPlanRow || legacyPlan) {
        // Fallback: use workout_plans / daily_plans tables
        let exercises = null;
        let workoutTitle = 'Today\'s Workout';
        let duration = null;
        let difficulty = null;
        if (workoutPlanRow) {
            try {
                const wpExercises = typeof workoutPlanRow.exercises === 'string'
                    ? JSON.parse(workoutPlanRow.exercises)
                    : workoutPlanRow.exercises;
                if (Array.isArray(wpExercises) && wpExercises.length > 0 && wpExercises[0].name !== 'Workout') {
                    exercises = wpExercises;
                }
            }
            catch { }
            workoutTitle = workoutPlanRow.focus || workoutTitle;
            duration = workoutPlanRow.duration;
            difficulty = workoutPlanRow.difficulty;
        }
        // If still no exercises, parse legacy markdown
        const legacyWorkout = legacyPlan?.workout_plan;
        const legacyDiet = legacyPlan?.diet_plan;
        const hasMeaningfulLegacyData = !!(legacyWorkout || legacyDiet);
        if (exercises || hasMeaningfulLegacyData) {
            // Build meals from legacy markdown if we have it
            let meals = null;
            if (legacyDiet && typeof legacyDiet === 'string') {
                meals = [{ type: 'Diet Plan', items: [legacyDiet.substring(0, 2000)] }];
            }
            todayPlan = {
                workout_title: workoutTitle,
                diet_title: legacyDiet ? 'Today\'s Diet Plan' : null,
                workout_exercises: exercises,
                diet_meals: meals,
                calories_target: workoutPlanRow?.calories_estimate || null,
                protein_goal: null,
                carb_goal: null,
                fat_goal: null,
                duration: duration,
                difficulty: difficulty,
            };
        }
    }
    return {
        weight_progress: weightProgress,
        stats,
        strength_progress: strengthProgress,
        most_improved: mostImproved,
        recent_workouts: recentWorkouts,
        today_stats: todayStats ? {
            calories_consumed: todayStats.calories_consumed,
            calories_burned: todayStats.calories_burned,
            water_ml: todayStats.water_ml,
            completed_percentage: todayStats.completed_percentage,
            weight_kg: todayStats.weight_kg,
            protein: todayStats.protein || 0,
            carbs: todayStats.carbs || 0,
            fats: todayStats.fats || 0,
        } : null,
        today_plan: todayPlan,
    };
}
/**
 * Upserts a body-metrics snapshot into progress_logs.
 * Returns the saved row.
 */
export async function logMetrics(userId, payload) {
    const date = payload.date ?? new Date().toISOString().split("T")[0];
    await dbRun(`INSERT INTO progress_logs
       (user_id, date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       weight_kg    = COALESCE(VALUES(weight_kg),    weight_kg),
       body_fat_pct = COALESCE(VALUES(body_fat_pct), body_fat_pct),
       chest_cm     = COALESCE(VALUES(chest_cm),     chest_cm),
       waist_cm     = COALESCE(VALUES(waist_cm),     waist_cm),
       hips_cm      = COALESCE(VALUES(hips_cm),      hips_cm),
       notes        = COALESCE(VALUES(notes),        notes)`, [
        userId,
        date,
        payload.weight_kg ?? null,
        payload.body_fat_pct ?? null,
        payload.chest_cm ?? null,
        payload.waist_cm ?? null,
        payload.hips_cm ?? null,
        payload.notes ?? null,
    ]);
}
// ─────────────────────────────────────────────────────────────────────────────
// Chat insight formatter
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Converts dashboard data into a short motivational chat message.
 * Called by the chat trigger in server.ts.
 */
export function buildChatInsight(data) {
    const lines = [];
    // Streak line
    if (data.stats.current_streak > 0) {
        lines.push(`🔥 You're on a **${data.stats.current_streak}-day workout streak** — don't break it!`);
    }
    else {
        lines.push(`💪 You've completed **${data.stats.total_workouts} workout${data.stats.total_workouts !== 1 ? "s" : ""}** in total.`);
    }
    // Weekly workouts
    if (data.stats.weekly_workouts > 0) {
        lines.push(`📅 This week you've trained **${data.stats.weekly_workouts} day${data.stats.weekly_workouts !== 1 ? "s" : ""}** (longest streak ever: ${data.stats.longest_streak}).`);
    }
    // Weight change
    if (data.weight_progress.length >= 2) {
        const first = data.weight_progress[0].weight_kg;
        const latest = data.weight_progress[data.weight_progress.length - 1].weight_kg;
        const diff = Math.round((first - latest) * 10) / 10;
        if (diff > 0) {
            lines.push(`⚖️ You've lost **${diff} kg** since you started tracking — great work!`);
        }
        else if (diff < 0) {
            lines.push(`⚖️ You've gained **${Math.abs(diff)} kg** — keep fuelling those gains!`);
        }
        else {
            lines.push(`⚖️ Your weight has stayed steady — consistency is key!`);
        }
    }
    // Most improved exercise
    if (data.most_improved) {
        const { exercise, improvement_pct } = data.most_improved;
        lines.push(`📈 Your **${exercise}** improved by **${improvement_pct}%** — that's real strength progress!`);
    }
    else if (data.strength_progress.length > 0) {
        lines.push(`💪 You've been tracking **${data.strength_progress.length} exercise${data.strength_progress.length !== 1 ? "s" : ""}** — keep logging to unlock strength insights!`);
    }
    // CTA
    lines.push(`\nKeep pushing — every rep counts! Want a detailed breakdown of any specific metric?`);
    return lines.join("\n");
}
