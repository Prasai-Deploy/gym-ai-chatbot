/**
 * services/workout.service.ts
 * Data-access layer for workout_plans and workout_logs tables.
 * Contains ONLY database queries — no AI logic, no HTTP concerns.
 */
import pool from "../db.js";
// ─────────────────────────────────────────────────────────────────────────────
// workout_plans queries
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fetch the most recent workout plan for a user.
 * Returns null if none exists yet.
 */
export async function getLatestPlan(userId) {
    const [rows] = await pool.execute(`SELECT * FROM workout_plans
     WHERE user_id = ?
     ORDER BY date DESC
     LIMIT 1`, [userId]);
    return rows[0] ?? null;
}
/**
 * Fetch the workout plan for a specific date.
 * Returns null if no plan exists for that date.
 */
export async function getPlanByDate(userId, date) {
    const [rows] = await pool.execute(`SELECT * FROM workout_plans
     WHERE user_id = ? AND date = ?`, [userId, date]);
    return rows[0] ?? null;
}
/**
 * Save (upsert) a generated workout plan.
 * Uses ON DUPLICATE KEY UPDATE so only one plan per user per day.
 * Returns the saved plan row.
 */
export async function savePlan(userId, date, plan, rawPrompt) {
    const exercisesJson = JSON.stringify(plan.exercises);
    await pool.execute(`INSERT INTO workout_plans (user_id, date, focus, duration, exercises, raw_prompt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       focus      = VALUES(focus),
       duration   = VALUES(duration),
       exercises  = VALUES(exercises),
       raw_prompt = VALUES(raw_prompt)`, [userId, date, plan.focus, plan.duration, exercisesJson, rawPrompt]);
    // Re-fetch so we always return the actual DB row (with id, created_at etc.)
    return getPlanByDate(userId, date);
}
// ─────────────────────────────────────────────────────────────────────────────
// workout_logs queries
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Return the most recent log entry for a specific exercise.
 * Used by the AI service to apply progressive overload.
 */
export async function getLastLog(userId, exerciseName) {
    const [rows] = await pool.execute(`SELECT * FROM workout_logs
     WHERE user_id = ? AND exercise_name = ?
     ORDER BY date DESC, logged_at DESC
     LIMIT 1`, [userId, exerciseName]);
    return rows[0] ?? null;
}
/**
 * Return the focus (split label) for the last N days of workout_plans.
 * Used to avoid repeating the same muscle group consecutively.
 */
export async function getRecentFocuses(userId, days = 4) {
    const [rows] = await pool.execute(`SELECT focus FROM workout_plans
     WHERE user_id = ?
     ORDER BY date DESC
     LIMIT ?`, [userId, days]);
    return rows.map((r) => r.focus).filter(Boolean);
}
/**
 * Bulk-insert completed exercise logs for a session.
 */
export async function saveLogs(userId, planId, date, exercises) {
    if (exercises.length === 0)
        return;
    const values = [];
    const placeholders = exercises
        .map((ex) => {
        values.push(userId, planId ?? null, date, ex.exercise_name, ex.sets_done ?? null, ex.reps_done ?? null, ex.weight_used ?? null, ex.difficulty ?? null, ex.notes ?? null);
        return "(?, ?, ?, ?, ?, ?, ?, ?, ?)";
    })
        .join(", ");
    await pool.execute(`INSERT INTO workout_logs
       (user_id, plan_id, date, exercise_name, sets_done, reps_done,
        weight_used, difficulty, notes)
     VALUES ${placeholders}`, values);
}
