/**
 * services/plan.service.ts
 * AI-generated workout and diet plan management via Supabase client.
 */
import supabase from "../db.js";
import { updateWeeklyProgress } from "./progress.service.js";

export async function saveAIWorkout(userId, plan, planId) {
    const { data } = await supabase.from("chatbot_generated_workouts").insert({
        user_id: userId, plan_id: planId || null,
        title: plan.title || "AI Workout Plan",
        exercises: JSON.stringify(plan.exercises),
        duration: plan.duration || null,
        difficulty: plan.difficulty || "Moderate",
        calories_estimate: plan.calories_estimate || 0,
    }).select("id").single();
    return data?.id;
}

export async function saveAIDiet(userId, plan, planId) {
    const { data } = await supabase.from("chatbot_generated_diets").insert({
        user_id: userId, plan_id: planId || null,
        title: plan.title || "AI Diet Plan",
        meals: JSON.stringify(plan.meals),
        calories_target: plan.calories_target || 0,
        protein: plan.protein || 0, carbs: plan.carbs || 0, fats: plan.fats || 0,
    }).select("id").single();
    return data?.id;
}

export async function linkActivePlans(userId, workoutId, dietId) {
    await supabase.from("user_fitness_plans").update({ active: 0 }).eq("user_id", userId).eq("active", 1);
    const { data } = await supabase.from("user_fitness_plans").insert({
        user_id: userId, workout_plan_id: workoutId || null, diet_plan_id: dietId || null, active: 1,
    }).select("id").single();
    return data?.id;
}

export async function getLatestActivePlan(userId) {
    // Fetch the plan link
    const { data: ufp } = await supabase.from("user_fitness_plans").select("*")
        .eq("user_id", userId).eq("active", 1).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ufp) return null;

    // Fetch workout and diet details
    let workout = null, diet = null;
    if (ufp.workout_plan_id) {
        const { data } = await supabase.from("chatbot_generated_workouts").select("*").eq("id", ufp.workout_plan_id).maybeSingle();
        workout = data;
    }
    if (ufp.diet_plan_id) {
        const { data } = await supabase.from("chatbot_generated_diets").select("*").eq("id", ufp.diet_plan_id).maybeSingle();
        diet = data;
    }

    const plan = { ...ufp };
    if (workout) {
        plan.workout_title = workout.title;
        plan.workout_exercises = typeof workout.exercises === "string" ? JSON.parse(workout.exercises) : workout.exercises;
        plan.duration = workout.duration;
        plan.difficulty = workout.difficulty;
        plan.calories_estimate = workout.calories_estimate;
    }
    if (diet) {
        plan.diet_title = diet.title;
        plan.diet_meals = typeof diet.meals === "string" ? JSON.parse(diet.meals) : diet.meals;
        plan.calories_target = diet.calories_target;
        plan.protein = diet.protein;
        plan.carbs = diet.carbs;
        plan.fats = diet.fats;
    }
    return plan;
}

export async function getPlanHistory(userId, limit = 10) {
    const { data: plans } = await supabase.from("user_fitness_plans").select("*")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (!plans || plans.length === 0) return [];

    // Fetch titles for each plan
    const workoutIds = plans.map((p) => p.workout_plan_id).filter(Boolean);
    const dietIds = plans.map((p) => p.diet_plan_id).filter(Boolean);

    const { data: workouts } = workoutIds.length > 0
        ? await supabase.from("chatbot_generated_workouts").select("id, title").in("id", workoutIds)
        : { data: [] };
    const { data: diets } = dietIds.length > 0
        ? await supabase.from("chatbot_generated_diets").select("id, title").in("id", dietIds)
        : { data: [] };

    const wMap = new Map((workouts || []).map((w) => [w.id, w.title]));
    const dMap = new Map((diets || []).map((d) => [d.id, d.title]));

    return plans.map((p) => ({
        ...p,
        workout_title: wMap.get(p.workout_plan_id) ?? null,
        diet_title: dMap.get(p.diet_plan_id) ?? null,
    }));
}

export async function logMeal(userId, date, meal) {
    const { data } = await supabase.from("user_meal_tracking").insert({
        user_id: userId, date,
        meal_type: meal.meal_type || null, food_item: meal.food_item || null,
        calories: meal.calories || 0, protein: meal.protein || 0,
        carbs: meal.carbs || 0, fats: meal.fats || 0,
    }).select("id").single();
    await updateWeeklyProgress(userId, date, { diet_completion: 25 });
    return data?.id;
}

export async function updateDailyProgress(userId, date, data) {
    const { data: existing } = await supabase.from("user_progress").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
    if (existing) {
        await supabase.from("user_progress").update({
            calories_consumed: (existing.calories_consumed || 0) + (data.calories_consumed || 0),
            calories_burned: (existing.calories_burned || 0) + (data.calories_burned || 0),
            water_ml: (existing.water_ml || 0) + (data.water_ml || 0),
            completed_percentage: Math.max(existing.completed_percentage || 0, data.completed_percentage || 0),
            weight_kg: data.weight_kg ?? existing.weight_kg,
            protein: (existing.protein || 0) + (data.protein || 0),
            carbs: (existing.carbs || 0) + (data.carbs || 0),
            fats: (existing.fats || 0) + (data.fats || 0),
        }).eq("user_id", userId).eq("date", date);
    } else {
        await supabase.from("user_progress").insert({
            user_id: userId, date,
            calories_consumed: data.calories_consumed || 0,
            calories_burned: data.calories_burned || 0,
            water_ml: data.water_ml || 0,
            completed_percentage: data.completed_percentage || 0,
            weight_kg: data.weight_kg || null,
            protein: data.protein || 0, carbs: data.carbs || 0, fats: data.fats || 0,
        });
    }
    await updateWeeklyProgress(userId, date, { calories_burned: data.calories_burned || 0 });
}
