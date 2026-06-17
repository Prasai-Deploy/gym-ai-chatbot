/**
 * services/workout.service.ts
 * Data-access layer for workout_plans and workout_logs tables.
 * Contains ONLY database queries — no AI logic, no HTTP concerns.
 */
import pool from "../db.js";
import { updateWeeklyProgress } from "./progress.service.js";
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
    await pool.execute(`INSERT INTO workout_plans (user_id, date, focus, duration, exercises, calories_estimate, difficulty, raw_prompt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       focus             = VALUES(focus),
       duration          = VALUES(duration),
       exercises         = VALUES(exercises),
       calories_estimate = VALUES(calories_estimate),
       difficulty        = VALUES(difficulty),
       raw_prompt        = VALUES(raw_prompt)`, [
        userId,
        date,
        plan.focus,
        plan.duration,
        exercisesJson,
        plan.calories_estimate ?? 0,
        plan.difficulty ?? "Moderate",
        rawPrompt,
    ]);
    // Sync to modern dashboard tables
    const { saveAIWorkout, linkActivePlans } = await import("./plan.service.js");
    const { setHydrationGoal } = await import("./water.service.js");
    const { createActivity } = await import("./activity.service.js");
    const workoutId = await saveAIWorkout(userId, {
        title: plan.focus || "Today's Workout",
        exercises: plan.exercises,
        duration: plan.duration,
        difficulty: plan.difficulty,
        calories_estimate: plan.calories_estimate
    });
    await linkActivePlans(userId, workoutId, undefined);
    await setHydrationGoal(userId, 3500, true, "Increased hydration for workout day.");
    await createActivity(userId, 'chatbot', 'AI Plan Generated', 'Coach generated a new workout plan.');
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
// ─────────────────────────────────────────────────────────────────────────────
// Live Session Management
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Start a new workout session for a given plan.
 */
export async function startSession(userId, planId) {
    const [result] = await pool.execute(`INSERT INTO workout_sessions (user_id, plan_id, status, start_time, completed_exercises, progress_percentage)
     VALUES (?, ?, 'active', NOW(), '[]', 0)`, [userId, planId]);
    const insertId = result.insertId;
    const [rows] = await pool.execute(`SELECT * FROM workout_sessions WHERE id = ?`, [insertId]);
    return rows[0];
}
/**
 * Update the progress of an active session.
 */
export async function updateSessionProgress(sessionId, completedExercises, progressPercentage, caloriesBurned) {
    await pool.execute(`UPDATE workout_sessions 
     SET completed_exercises = ?, progress_percentage = ?, calories_burned = ?
     WHERE id = ?`, [JSON.stringify(completedExercises), progressPercentage, caloriesBurned, sessionId]);
}
/**
 * Finalize a workout session.
 */
export async function completeSession(sessionId) {
    // 1. Fetch session info before completing
    const [sessionRows] = await pool.execute(`SELECT user_id, calories_burned, completed_exercises, start_time 
     FROM workout_sessions WHERE id = ?`, [sessionId]);
    const session = sessionRows[0];
    // 2. Mark as completed
    await pool.execute(`UPDATE workout_sessions 
     SET status = 'completed', end_time = NOW()
     WHERE id = ?`, [sessionId]);
    if (session) {
        const exercises = typeof session.completed_exercises === "string"
            ? JSON.parse(session.completed_exercises)
            : (session.completed_exercises || []);
        // Calculate duration in minutes
        const startTime = new Date(session.start_time);
        const endTime = new Date();
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        // 3. Update weekly progress
        await updateWeeklyProgress(session.user_id, new Date().toISOString().split('T')[0], {
            workouts_completed: 1,
            exercises_completed: exercises.length,
            calories_burned: session.calories_burned || 0,
            workout_duration: durationMinutes
        });
    }
}
/**
 * Fetch the active session for today, if any.
 */
export async function getTodaySession(userId) {
    const [rows] = await pool.execute(`SELECT * FROM workout_sessions 
     WHERE user_id = ? AND status = 'active'
     ORDER BY created_at DESC 
     LIMIT 1`, [userId]);
    return rows[0] ?? null;
}
/**
 * Fetch workout history for a user.
 */
export async function getWorkoutHistory(userId, limit = 10) {
    const [rows] = await pool.execute(`SELECT s.*, p.focus as workout_title, p.duration as planned_duration
     FROM workout_sessions s
     JOIN workout_plans p ON s.plan_id = p.id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC
     LIMIT ?`, [userId, limit]);
    return rows;
}
/**
 * Save raw AI-generated plan for audit/history.
 */
export async function saveToChatbotLog(userId, rawJson) {
    await pool.execute(`INSERT INTO chatbot_generated_plans (user_id, raw_json)
     VALUES (?, ?)`, [userId, JSON.stringify(rawJson)]);
}
