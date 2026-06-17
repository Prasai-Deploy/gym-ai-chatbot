/**
 * services/plan.service.ts
 * Logic for managing AI-generated workout and diet plans.
 */
import pool from "../db.js";
import { updateWeeklyProgress } from "./progress.service.js";
/**
 * Saves a generated workout plan to the database.
 */
export async function saveAIWorkout(userId, plan, planId) {
    const [result] = await pool.execute(`INSERT INTO chatbot_generated_workouts 
     (user_id, plan_id, title, exercises, duration, difficulty, calories_estimate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        userId,
        planId || null,
        plan.title || "AI Workout Plan",
        JSON.stringify(plan.exercises),
        plan.duration || null,
        plan.difficulty || "Moderate",
        plan.calories_estimate || 0
    ]);
    return result.insertId;
}
/**
 * Saves a generated diet plan to the database.
 */
export async function saveAIDiet(userId, plan, planId) {
    const [result] = await pool.execute(`INSERT INTO chatbot_generated_diets
     (user_id, plan_id, title, meals, calories_target, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        userId,
        planId || null,
        plan.title || "AI Diet Plan",
        JSON.stringify(plan.meals),
        plan.calories_target || 0,
        plan.protein || 0,
        plan.carbs || 0,
        plan.fats || 0
    ]);
    return result.insertId;
}
/**
 * Links workout and diet plans to a user's active fitness profile.
 */
export async function linkActivePlans(userId, workoutId, dietId) {
    // Deactivate previous active plans
    await pool.execute("UPDATE user_fitness_plans SET active = 0 WHERE user_id = ? AND active = 1", [userId]);
    // Insert new active plan
    const [result] = await pool.execute(`INSERT INTO user_fitness_plans (user_id, workout_plan_id, diet_plan_id, active)
     VALUES (?, ?, ?, 1)`, [userId, workoutId || null, dietId || null]);
    return result.insertId;
}
/**
 * Fetches the latest active plans for a user.
 */
export async function getLatestActivePlan(userId) {
    const [rows] = await pool.execute(`SELECT ufp.*, 
            cgw.title as workout_title, cgw.exercises as workout_exercises, cgw.duration, cgw.difficulty, cgw.calories_estimate,
            cgd.title as diet_title, cgd.meals as diet_meals, cgd.calories_target, cgd.protein, cgd.carbs, cgd.fats
     FROM user_fitness_plans ufp
     LEFT JOIN chatbot_generated_workouts cgw ON ufp.workout_plan_id = cgw.id
     LEFT JOIN chatbot_generated_diets cgd ON ufp.diet_plan_id = cgd.id
     WHERE ufp.user_id = ? AND ufp.active = 1
     ORDER BY ufp.created_at DESC LIMIT 1`, [userId]);
    const plan = rows[0];
    if (plan) {
        if (plan.workout_exercises)
            plan.workout_exercises = JSON.parse(plan.workout_exercises);
        if (plan.diet_meals)
            plan.diet_meals = JSON.parse(plan.diet_meals);
    }
    return plan || null;
}
/**
 * Fetches the history of plans for a user.
 */
export async function getPlanHistory(userId, limit = 10) {
    const [rows] = await pool.execute(`SELECT ufp.*, 
            cgw.title as workout_title, cgd.title as diet_title
     FROM user_fitness_plans ufp
     LEFT JOIN chatbot_generated_workouts cgw ON ufp.workout_plan_id = cgw.id
     LEFT JOIN chatbot_generated_diets cgd ON ufp.diet_plan_id = cgd.id
     WHERE ufp.user_id = ?
     ORDER BY ufp.created_at DESC LIMIT ?`, [userId, limit]);
    return rows;
}
/**
 * Logs user meal tracking.
 */
export async function logMeal(userId, date, meal) {
    const [result] = await pool.execute(`INSERT INTO user_meal_tracking (user_id, date, meal_type, food_item, calories, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        userId,
        date,
        meal.meal_type || null,
        meal.food_item || null,
        meal.calories || 0,
        meal.protein || 0,
        meal.carbs || 0,
        meal.fats || 0
    ]);
    const insertId = result.insertId;
    // Sync with weekly progress (diet consistency)
    await updateWeeklyProgress(userId, date, {
        diet_completion: 25 // Increment by 25% per meal logged
    });
    return insertId;
}
/**
 * Updates daily progress stats — includes macro nutrients (migration 008).
 */
export async function updateDailyProgress(userId, date, data) {
    const [result] = await pool.execute(`INSERT INTO user_progress 
       (user_id, date, calories_consumed, calories_burned, water_ml, completed_percentage, weight_kg, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       calories_consumed    = calories_consumed    + VALUES(calories_consumed),
       calories_burned      = calories_burned      + VALUES(calories_burned),
       water_ml             = water_ml             + VALUES(water_ml),
       completed_percentage = GREATEST(completed_percentage, VALUES(completed_percentage)),
       weight_kg            = COALESCE(VALUES(weight_kg), weight_kg),
       protein              = IFNULL(protein, 0)  + VALUES(protein),
       carbs                = IFNULL(carbs, 0)    + VALUES(carbs),
       fats                 = IFNULL(fats, 0)     + VALUES(fats),
       updated_at           = CURRENT_TIMESTAMP`, [
        userId,
        date,
        data.calories_consumed || 0,
        data.calories_burned || 0,
        data.water_ml || 0,
        data.completed_percentage || 0,
        data.weight_kg || null,
        data.protein || 0,
        data.carbs || 0,
        data.fats || 0,
    ]);
    const affected = result.affectedRows;
    // Sync with weekly progress
    await updateWeeklyProgress(userId, date, {
        calories_burned: data.calories_burned || 0,
    });
    return affected;
}
