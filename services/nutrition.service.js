/**
 * services/nutrition.service.ts
 * Calorie calculation, meal plan generation, and food logging via Supabase.
 */
import supabase from "../db.js";
import { callAI } from "./ai.service.js";
import { getProfile } from "./profile.service.js";

export function calculateMacroGoals(profile) {
    const { weight_kg, height_cm, age, activity_level, goal } = profile;
    const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
    const multipliers = { "sedentary": 1.2, "lightly active": 1.375, "active": 1.55, "very active": 1.725 };
    const tdee = bmr * (multipliers[activity_level.toLowerCase()] || 1.2);
    let targetCalories = tdee;
    const goalLower = goal.toLowerCase();
    if (goalLower.includes("loss") || goalLower.includes("cut") || goalLower.includes("lose")) targetCalories -= 500;
    else if (goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("muscle")) targetCalories += 400;
    return {
        calories: Math.round(targetCalories),
        protein: Math.round((targetCalories * 0.30) / 4),
        carbs: Math.round((targetCalories * 0.40) / 4),
        fats: Math.round((targetCalories * 0.30) / 9),
    };
}

export async function generateMealPlan(userId) {
    const profile = await getProfile(userId);
    if (!profile) throw new Error("User profile not found.");
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
    { "type": "Breakfast", "items": ["Item 1", "Item 2"], "calories": 400 },
    ...
  ]
}
Include specific Indian food items like Poha, Paneer, Roti, Dal, etc., based on the diet type.`;
    const aiResponse = await callAI("Generate my meal plan for today.", systemPrompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to generate structured meal plan.");
    const mealPlanData = JSON.parse(jsonMatch[0]);

    await supabase.from("meal_plans").upsert({
        user_id: userId,
        date: today,
        calories_target: mealPlanData.calories_target,
        meals: JSON.stringify(mealPlanData.meals),
    }, { onConflict: "user_id,date" });

    return mealPlanData;
}

export async function logFoodIntake(userId, foodText) {
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are a nutrition assistant.
The user will describe what they ate. Estimate nutritional value focusing on Indian foods.
The output MUST be in the following JSON format ONLY:
{ "food_item": "Detailed name", "calories": 450, "protein": 20, "carbs": 50, "fats": 15 }`;
    const aiResponse = await callAI(foodText, systemPrompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse food intake.");
    const logData = JSON.parse(jsonMatch[0]);

    await supabase.from("nutrition_logs").insert({
        user_id: userId, date: today,
        food_item: logData.food_item, calories: logData.calories,
        protein: logData.protein, carbs: logData.carbs, fats: logData.fats,
    });
    return logData;
}

export async function getDailySummary(userId, date) {
    const { data: logs } = await supabase
        .from("nutrition_logs")
        .select("calories, protein, carbs, fats")
        .eq("user_id", userId)
        .eq("date", date);

    const totals = (logs || []).reduce((acc, log) => ({
        total_calories: acc.total_calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fats || 0),
    }), { total_calories: 0, protein: 0, carbs: 0, fats: 0 });

    return totals;
}
