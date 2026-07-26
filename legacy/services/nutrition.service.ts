/**
 * services/nutrition.service.ts
 * AI-powered nutrition plan generation and meal logging via Groq + Supabase.
 */
import Groq from "groq-sdk";
import supabase from "../db.js";
import { getProfile } from "./profile.service.js";
import { logMeal, updateDailyProgress } from "./plan.service.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_PRIMARY_MODEL || "compound-beta";

export async function generateMealPlan(userId: number) {
  const profile = await getProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const prompt = `Generate a detailed daily meal plan for this user:
- Goal: ${profile.goal}
- Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm | Age: ${profile.age}
- Diet type: ${profile.diet_type}
- Activity level: ${profile.activity_level}

Respond with ONLY a valid JSON object:
{
  "calories_target": 2000,
  "protein": 150,
  "carbs": 200,
  "fats": 65,
  "meals": [
    {
      "type": "Breakfast",
      "calories": 450,
      "protein": 35,
      "carbs": 50,
      "fats": 12,
      "items": ["Oats with banana", "2 boiled eggs", "Black coffee"]
    }
  ]
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  const plan = JSON.parse(raw);

  // Save to Supabase
  await supabase.from("chatbot_generated_diets").insert({
    user_id: userId,
    title: "Daily Meal Plan",
    meals: JSON.stringify(plan.meals),
    calories_target: plan.calories_target || 0,
    protein: plan.protein || 0,
    carbs: plan.carbs || 0,
    fats: plan.fats || 0,
  });

  return plan;
}

export async function logFoodIntake(userId: number, message: string) {
  const prompt = `Extract nutritional info from this message: "${message}"
Return ONLY valid JSON:
{
  "food_item": "chicken breast",
  "meal_type": "Lunch",
  "calories": 250,
  "protein": 45,
  "carbs": 0,
  "fats": 5
}`;

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_FAST_MODEL || "compound-beta-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  const log = JSON.parse(raw);
  const date = new Date().toISOString().split("T")[0];

  await logMeal(userId, date, log);
  await updateDailyProgress(userId, date, {
    calories_consumed: log.calories || 0,
    protein: log.protein || 0,
    carbs: log.carbs || 0,
    fats: log.fats || 0,
  });

  return log;
}

export async function getDailySummary(userId: number, date: string) {
  const { data: meals } = await supabase
    .from("user_meal_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date);

  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  const totals = (meals || []).reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fats:     acc.fats     + (m.fats     || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return { date, meals: meals || [], totals, progress };
}
