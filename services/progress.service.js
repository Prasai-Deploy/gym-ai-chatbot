import pool from "../db.js";
/**
 * Upserts daily activity metrics into the weekly_progress table.
 */
export async function updateWeeklyProgress(userId, date, data) {
    const sql = `
    INSERT INTO weekly_progress (
      user_id, date, workouts_completed, exercises_completed, 
      calories_burned, workout_duration, hydration_completion, 
      diet_completion, streak_value
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      workouts_completed   = workouts_completed + VALUES(workouts_completed),
      exercises_completed  = exercises_completed + VALUES(exercises_completed),
      calories_burned      = calories_burned + VALUES(calories_burned),
      workout_duration     = workout_duration + VALUES(workout_duration),
      hydration_completion = GREATEST(hydration_completion, VALUES(hydration_completion)),
      diet_completion      = GREATEST(diet_completion, VALUES(diet_completion)),
      streak_value         = GREATEST(streak_value, VALUES(streak_value))
  `;
    const params = [
        userId,
        date,
        data.workouts_completed || 0,
        data.exercises_completed || 0,
        data.calories_burned || 0,
        data.workout_duration || 0,
        data.hydration_completion || 0,
        data.diet_completion || 0,
        data.streak_value || 0
    ];
    await pool.execute(sql, params);
    // Also update real-time daily stats
    await updateDailyFitnessStats(userId, {
        daily_progress_percentage: data.hydration_completion || 0,
        active_minutes: data.workout_duration || 0,
        completed_goals: data.workouts_completed || 0
    });
}
/**
 * Updates the user's real-time daily fitness status.
 */
export async function updateDailyFitnessStats(userId, data) {
    const sql = `
    INSERT INTO daily_fitness_stats (
      user_id, daily_progress_percentage, active_minutes, completed_goals
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      daily_progress_percentage = GREATEST(daily_progress_percentage, VALUES(daily_progress_percentage)),
      active_minutes            = active_minutes + VALUES(active_minutes),
      completed_goals           = completed_goals + VALUES(completed_goals)
  `;
    const params = [
        userId,
        data.daily_progress_percentage || 0,
        data.active_minutes || 0,
        data.completed_goals || 0
    ];
    await pool.execute(sql, params);
}
/**
 * Fetches the last 7 days of activity for the weekly graph.
 */
export async function getWeeklyChartData(userId) {
    const [rows] = await pool.execute(`SELECT date, workouts_completed, exercises_completed, calories_burned, 
            workout_duration, hydration_completion, diet_completion
     FROM weekly_progress
     WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     ORDER BY date ASC`, [userId]);
    return rows;
}
/**
 * Fetches a summary of the current week's analytics.
 */
export async function getWeeklySummary(userId) {
    const [rows] = await pool.execute(`SELECT 
      SUM(workouts_completed) as total_workouts,
      SUM(exercises_completed) as total_exercises,
      SUM(calories_burned) as total_calories,
      SUM(workout_duration) as total_duration,
      AVG(hydration_completion) as avg_hydration,
      AVG(diet_completion) as avg_diet,
      MAX(streak_value) as best_streak
     FROM weekly_progress
     WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`, [userId]);
    return rows[0];
}
/**
 * Fetches daily stats for the logged-in user.
 */
export async function getDailyStats(userId) {
    const [rows] = await pool.execute(`SELECT * FROM daily_fitness_stats WHERE user_id = ?`, [userId]);
    return rows[0] || { daily_progress_percentage: 0, active_minutes: 0, completed_goals: 0 };
}
/**
 * Logs manual user progress entry.
 */
export async function logManualProgress(userId, data) {
    const date = new Date().toISOString().split('T')[0];
    // 1. Update weekly progress table
    await updateWeeklyProgress(userId, date, {
        calories_burned: data.calories || 0,
        hydration_completion: data.water ? Math.min(100, Math.round((data.water / 2000) * 100)) : 0
    });
    // 2. Also keep user_progress table in sync for other dashboard widgets
    await pool.execute(`INSERT INTO user_progress (user_id, date, calories_consumed, calories_burned, water_ml)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       calories_consumed = calories_consumed + VALUES(calories_consumed),
       calories_burned = calories_burned + VALUES(calories_burned),
       water_ml = water_ml + VALUES(water_ml)`, [userId, date, 0, data.calories || 0, data.water || 0]);
    return { success: true };
}
/**
 * Builds a text summary of progress for the AI context.
 */
export async function buildProgressInsight(userId) {
    const summary = await getWeeklySummary(userId);
    if (!summary || !summary.total_workouts)
        return "User has no recorded activity this week.";
    return `Weekly Summary:
- Total Workouts: ${summary.total_workouts}
- Total Calories Burned: ${summary.total_calories} kcal
- Total Active Minutes: ${summary.total_duration}
- Hydration Success: ${Math.round(summary.avg_hydration)}%
- Diet Consistency: ${Math.round(summary.avg_diet)}%
- Best Streak: ${summary.best_streak} days`;
}
