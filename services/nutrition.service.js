/**
 * services/nutrition.service.ts
 * Logic for calorie calculation, meal plan generation, and food logging.
 */
import pool from "../db.js";
import { callAI } from "./ai.service.js";
import { getProfile } from "./profile.service.js";
/**
 * Calculates calorie and macro targets based on user profile.
 * Uses Mifflin-St Jeor Equation.
 */
export function calculateMacroGoals(profile) {
    const { weight_kg, height_cm, age, activity_level, goal } = profile;
    // 1. Calculate BMR (Assuming male for now as sex is not in profile, 
    // or a neutral offset. Let's use +5 for male)
    const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
    // 2. Activity Multiplier
    const multipliers = {
        "sedentary": 1.2,
        "lightly active": 1.375,
        "active": 1.55,
        "very active": 1.725,
    };
    const tdee = bmr * (multipliers[activity_level.toLowerCase()] || 1.2);
    // 3. Goal Adjustment
    let targetCalories = tdee;
    const goalLower = goal.toLowerCase();
    if (goalLower.includes("loss") || goalLower.includes("cut") || goalLower.includes("lose")) {
        targetCalories -= 500;
    }
    else if (goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("muscle")) {
        targetCalories += 400;
    }
    // 4. Macro Splits (Standard healthy split: 30% P, 40% C, 30% F)
    // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fats: 9 kcal/g
    const protein = Math.round((targetCalories * 0.30) / 4);
    const carbs = Math.round((targetCalories * 0.40) / 4);
    const fats = Math.round((targetCalories * 0.30) / 9);
    return {
        calories: Math.round(targetCalories),
        protein,
        carbs,
        fats,
    };
}
/**
 * Generates a meal plan using AI.
 */
export async function generateMealPlan(userId) {
    const profile = await getProfile(userId);
    if (!profile)
        throw new Error("User profile not found.");
    const goals = calculateMacroGoals(profile);
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are an expert nutrition coach with deep knowledge of Indian diets.
Generate a structured meal plan based on the user's details.
Goal: ${profile.goal}
Diet Type: ${profile.diet_type}
Target Calories: ${goals.calories} kcal
Target Macros: P: ${goals.protein}g, C: ${goals.carbs}g, F: ${goals.fats}g

The output MUST be in the following JSON format ONLY:
{
  "calories_target": ${goals.calories},
  "meals": [
    {
      "type": "Breakfast",
      "items": ["Item 1", "Item 2"],
      "calories": 400
    },
    ...
  ]
}
Include specific Indian food items like Poha, Paneer, Roti, Dal, etc., based on the diet type.`;
    const aiResponse = await callAI("Generate my meal plan for today.", systemPrompt);
    // Extract JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error("Failed to generate structured meal plan.");
    const mealPlanData = JSON.parse(jsonMatch[0]);
    // Save to database
    await pool.execute(`INSERT INTO meal_plans (user_id, date, calories_target, meals)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       calories_target = VALUES(calories_target),
       meals = VALUES(meals)`, [userId, today, mealPlanData.calories_target, JSON.stringify(mealPlanData.meals)]);
    // Sync to modern dashboard tables
    const { saveAIDiet, linkActivePlans } = await import("./plan.service.js");
    const dietId = await saveAIDiet(userId, {
        title: "Personalized Meal Plan",
        meals: mealPlanData.meals,
        calories_target: mealPlanData.calories_target
    });
    await linkActivePlans(userId, undefined, dietId);
    return mealPlanData;
}
/**
 * Logs food intake using AI to estimate macros.
 */
export async function logFoodIntake(userId, foodText) {
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are a nutrition assistant.
The user will describe what they ate. You must estimate the nutritional value.
Focus on Indian foods. If the user says "I ate 2 rotis and paneer", estimate accordingly.

The output MUST be in the following JSON format ONLY:
{
  "food_item": "Detailed name of food",
  "calories": 450,
  "protein": 20,
  "carbs": 50,
  "fats": 15
}
If multiple items are mentioned, group them into one entry or return the total estimate.`;
    const aiResponse = await callAI(foodText, systemPrompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error("Failed to parse food intake.");
    const logData = JSON.parse(jsonMatch[0]);
    // Save to database
    await pool.execute(`INSERT INTO nutrition_logs (user_id, date, food_item, calories, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, today, logData.food_item, logData.calories, logData.protein, logData.carbs, logData.fats]);
    // Sync to modern dashboard tables
    const { logMeal, updateDailyProgress } = await import("./plan.service.js");
    await logMeal(userId, today, {
        meal_type: "AI Log",
        food_item: logData.food_item,
        calories: logData.calories,
        protein: logData.protein,
        carbs: logData.carbs,
        fats: logData.fats
    });
    await updateDailyProgress(userId, today, {
        calories_consumed: logData.calories,
        protein: logData.protein,
        carbs: logData.carbs,
        fats: logData.fats
    });
    return logData;
}
/**
 * Gets daily nutrition summary.
 */
export async function getDailySummary(userId, date) {
    const [rows] = await pool.execute(`SELECT 
       SUM(calories) as total_calories,
       SUM(protein) as protein,
       SUM(carbs) as carbs,
       SUM(fats) as fats
     FROM nutrition_logs
     WHERE user_id = ? AND date = ?`, [userId, date]);
    const summary = rows[0];
    return {
        total_calories: Number(summary.total_calories || 0),
        protein: Number(summary.protein || 0),
        carbs: Number(summary.carbs || 0),
        fats: Number(summary.fats || 0),
    };
}
