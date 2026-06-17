/**
 * services/water.service.ts
 * Logic for smart hydration tracking and AI-connected goals.
 */
import pool from "../db.js";
import { updateWeeklyProgress } from "./progress.service.js";
/**
 * Adds a water intake entry and updates daily progress.
 */
export async function addWaterIntake(userId, amount, source = 'manual') {
    const date = new Date().toISOString().split('T')[0];
    // 1. Insert log
    await pool.execute(`INSERT INTO water_logs (user_id, intake_amount, source) VALUES (?, ?, ?)`, [userId, amount, source]);
    await pool.execute(`INSERT INTO daily_hydration_progress (user_id, date, total_consumed)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       total_consumed = total_consumed + VALUES(total_consumed),
       completion_percentage = LEAST(100, ROUND((total_consumed / daily_goal) * 100))`, [userId, date, amount]);
    // 3. Sync with weekly progress
    const [progRows] = await pool.execute("SELECT completion_percentage FROM daily_hydration_progress WHERE user_id = ? AND date = ?", [userId, date]);
    const pct = progRows[0]?.completion_percentage || 0;
    await updateWeeklyProgress(userId, date, {
        hydration_completion: pct
    });
    return { success: true };
}
/**
 * Updates a water intake entry.
 */
export async function updateWaterIntake(userId, logId, amount) {
    const [rows] = await pool.execute("SELECT intake_amount FROM water_logs WHERE id = ? AND user_id = ?", [logId, userId]);
    const oldAmount = rows[0]?.intake_amount || 0;
    const diff = amount - oldAmount;
    await pool.execute("UPDATE water_logs SET intake_amount = ? WHERE id = ? AND user_id = ?", [amount, logId, userId]);
    const date = new Date().toISOString().split('T')[0];
    await pool.execute(`UPDATE daily_hydration_progress 
     SET total_consumed = total_consumed + ?,
         completion_percentage = LEAST(100, ROUND((total_consumed / daily_goal) * 100))
     WHERE user_id = ? AND date = ?`, [diff, userId, date]);
}
/**
 * Deletes a water intake entry.
 */
export async function deleteWaterIntake(userId, logId) {
    const [rows] = await pool.execute("SELECT intake_amount FROM water_logs WHERE id = ? AND user_id = ?", [logId, userId]);
    const amount = rows[0]?.intake_amount || 0;
    await pool.execute("DELETE FROM water_logs WHERE id = ? AND user_id = ?", [logId, userId]);
    const date = new Date().toISOString().split('T')[0];
    await pool.execute(`UPDATE daily_hydration_progress 
     SET total_consumed = GREATEST(0, total_consumed - ?),
         completion_percentage = LEAST(100, ROUND((total_consumed / daily_goal) * 100))
     WHERE user_id = ? AND date = ?`, [amount, userId, date]);
}
/**
 * Sets or updates the daily hydration goal.
 */
export async function setHydrationGoal(userId, goalMl, isAI = false, reason) {
    const date = new Date().toISOString().split('T')[0];
    // 1. Save goal history
    await pool.execute(`INSERT INTO water_goals (user_id, daily_goal, generated_by_ai, goal_reason)
     VALUES (?, ?, ?, ?)`, [userId, goalMl, isAI ? 1 : 0, reason || null]);
    // 2. Update today's progress goal
    await pool.execute(`INSERT INTO daily_hydration_progress (user_id, date, daily_goal)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       daily_goal = VALUES(daily_goal),
       completion_percentage = LEAST(100, ROUND((total_consumed / daily_goal) * 100))`, [userId, date, goalMl]);
}
/**
 * Gets today's hydration summary.
 */
export async function getTodayHydration(userId) {
    const date = new Date().toISOString().split('T')[0];
    const [rows] = await pool.execute("SELECT * FROM daily_hydration_progress WHERE user_id = ? AND date = ?", [userId, date]);
    return rows[0] || { user_id: userId, date, total_consumed: 0, daily_goal: 2000, completion_percentage: 0 };
}
/**
 * Gets hydration logs for today.
 */
export async function getTodayLogs(userId) {
    const [rows] = await pool.execute(`SELECT * FROM water_logs 
     WHERE user_id = ? AND DATE(created_at) = CURDATE() 
     ORDER BY created_at DESC`, [userId]);
    return rows;
}
/**
 * Gets hydration history.
 */
export async function getHydrationHistory(userId, limit = 7) {
    const [rows] = await pool.execute(`SELECT * FROM daily_hydration_progress 
     WHERE user_id = ? 
     ORDER BY date DESC LIMIT ?`, [userId, limit]);
    return rows;
}
