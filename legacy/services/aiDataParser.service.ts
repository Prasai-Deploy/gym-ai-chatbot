/**
 * services/aiDataParser.service.ts
 * Centralized AI conversation → fitness data extraction engine via Supabase.
 */
import supabase from "../db.js";
import { upsertProfile } from "./profile.service.js";
import { addWaterIntake, setHydrationGoal } from "./water.service.js";
import { createActivity } from "./activity.service.js";
import { logMeal, updateDailyProgress, saveAIWorkout, saveAIDiet, linkActivePlans } from "./plan.service.js";
import { updateWeeklyProgress } from "./progress.service.js";

async function isDuplicateToday(userId: number, date: string, dataType: string, dataKey: string | null) {
  if (!dataKey) return false;
  const { data } = await supabase.from("ai_chat_logs").select("id")
    .eq("user_id", userId).eq("date", date).eq("data_type", dataType).eq("data_key", dataKey).limit(1).maybeSingle();
  return !!data;
}

async function recordChatLog(userId: number, date: string, dataType: string, dataKey: string | null, dataJson: any) {
  try {
    await supabase.from("ai_chat_logs").insert({
      user_id: userId, date, data_type: dataType, data_key: dataKey, data_json: JSON.stringify(dataJson),
    });
  } catch { /* non-fatal */ }
}

async function handleProfileUpdate(userId: number, data: any) {
  if (!data || Object.keys(data).length === 0) return false;
  await upsertProfile(userId, data);
  console.log("[aiDataParser] Profile updated for user", userId);
  return true;
}

async function handleMemory(userId: number, memory: string, currentContext: string) {
  const newContext = (currentContext ? currentContext + "\n" : "") + "- " + memory;
  await supabase.from("users").update({ profile_context: newContext }).eq("id", userId);
  console.log("[aiDataParser] Memory saved for user", userId);
  return newContext;
}

async function handleMacroGoals(userId: number, mg: any) {
  await supabase.from("users").update({
    calorie_goal: mg.calories || 0,
    protein_goal: mg.protein || 0,
    carb_goal: mg.carbs || 0,
    fat_goal: mg.fats || 0,
  }).eq("id", userId);
  console.log("[aiDataParser] Macro goals updated for user", userId);
  return true;
}

async function handlePlans(userId: number, workoutPlan: any, dietPlan: any) {
  const formattedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date());

  await supabase.from("daily_plans").upsert({
    user_id: userId, date: formattedDate,
    workout_plan: workoutPlan ? (typeof workoutPlan === "string" ? workoutPlan : JSON.stringify(workoutPlan)) : "",
    diet_plan: dietPlan ? (typeof dietPlan === "string" ? dietPlan : JSON.stringify(dietPlan)) : "",
    completed: 0,
  }, { onConflict: "user_id,date" });

  let workoutId: any, dietId: any;
  if (workoutPlan) {
    const workoutObj = typeof workoutPlan === "string"
      ? { title: "Today's Workout", exercises: [{ name: "Workout", description: workoutPlan }] }
      : workoutPlan;
    workoutId = await saveAIWorkout(userId, workoutObj);
  }
  if (dietPlan) {
    const dietObj = typeof dietPlan === "string"
      ? { title: "Today's Diet", meals: [{ type: "Full Day", items: [dietPlan] }] }
      : dietPlan;
    dietId = await saveAIDiet(userId, dietObj);
  }
  if (workoutId || dietId) {
    await linkActivePlans(userId, workoutId, dietId);
    const hydrationGoal = workoutPlan ? 3500 : 2500;
    const reason = workoutPlan ? "Increased hydration for your workout day!" : "Standard daily hydration target.";
    await setHydrationGoal(userId, hydrationGoal, true, reason);
    await createActivity(userId, "chatbot", "AI Plan Generated",
      `Coach generated a new ${workoutPlan ? "workout" : "diet"} plan and set hydration to ${hydrationGoal / 1000}L.`);
  }
  console.log("[aiDataParser] Plans saved for user", userId);
  return true;
}

async function handleProgressLog(userId: number, p: any) {
  const result = { progress: false, hydration: false, weight: false, activity: false };
  const today = new Date().toISOString().split("T")[0];

  const caloriesConsumed = p.calories_consumed ?? p.calories ?? 0;
  const caloriesBurned = p.calories_burned ?? 0;
  const protein = p.protein ?? p.protein_g ?? 0;
  const carbs = p.carbs ?? 0;
  const fats = p.fats ?? 0;
  const waterMl = p.water_ml ?? (p.water ? p.water * 1000 : 0);
  const bodyWeightKg = p.body_weight_kg ?? null;
  const workoutName = p.workout_name || null;
  const workoutCompleted = p.workout_completed ?? (!!workoutName);
  const muscleGroup = p.muscle_group || null;

  if (workoutName || caloriesConsumed || protein || carbs || fats) {
    const dupKey = workoutName || (caloriesConsumed ? `cal_${caloriesConsumed}` : null);
    const isDup = await isDuplicateToday(userId, today, "workout", dupKey);
    if (!isDup) {
      await supabase.from("progress").insert({
        user_id: userId, date: today, workout_name: workoutName || "AI Log",
        calories: caloriesConsumed, protein, water: Math.round(waterMl / 1000), carbs, fats,
      });
      await updateDailyProgress(userId, today, {
        calories_consumed: caloriesConsumed, calories_burned: caloriesBurned,
        water_ml: waterMl, protein, carbs, fats, weight_kg: bodyWeightKg,
      });
      if (caloriesConsumed || protein) {
        await logMeal(userId, today, {
          meal_type: "AI Log", food_item: p.food_item || workoutName || "AI Log",
          calories: caloriesConsumed, protein, carbs, fats,
        });
      }
      if (workoutCompleted || caloriesBurned) {
        await updateWeeklyProgress(userId, today, {
          workouts_completed: workoutCompleted ? 1 : 0,
          exercises_completed: p.exercises?.length || 0,
          calories_burned: caloriesBurned,
          diet_completion: caloriesConsumed ? 25 : 0,
        });
      }
      if (p.exercises && p.exercises.length > 0) {
        const rows = p.exercises.map((ex: any) => ({
          user_id: userId, date: today, exercise_name: ex.name,
          sets_done: ex.sets || null, reps_done: ex.reps || null, weight_used: ex.weight_kg || null,
        }));
        await supabase.from("workout_logs").insert(rows);
      }
      if (workoutCompleted && workoutName) {
        await createActivity(userId, "chat",
          `Workout Logged: ${workoutName}${muscleGroup ? ` (${muscleGroup})` : ""}`,
          `AI auto-logged your ${workoutName}${p.exercises?.length ? ` — ${p.exercises.length} exercises tracked` : ""}.`);
      }
      await recordChatLog(userId, today, "workout", dupKey, { workoutName, caloriesConsumed, protein, carbs, fats });
      result.progress = true;
    }
  }

  if (waterMl > 0) {
    await addWaterIntake(userId, waterMl, "ai");
    await createActivity(userId, "chat",
      `Water Logged: ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"}`,
      `AI auto-logged ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"} of water intake.`);
    result.hydration = true;
  }

  if (bodyWeightKg && bodyWeightKg > 0) {
    await supabase.from("progress_logs").upsert({ user_id: userId, date: today, weight_kg: bodyWeightKg }, { onConflict: "user_id,date" });
    await supabase.from("fitness_profiles").upsert({ user_id: userId, weight_kg: bodyWeightKg }, { onConflict: "user_id" });
    await createActivity(userId, "chat", `Weight Logged: ${bodyWeightKg}kg`, `AI auto-logged your body weight as ${bodyWeightKg}kg.`);
    result.weight = true;
  }

  if (p.cardio_type) {
    const cardioKey = `${p.cardio_type}_${today}`;
    const isDupCardio = await isDuplicateToday(userId, today, "cardio", cardioKey);
    if (!isDupCardio) {
      const calBurned = p.calories_burned || estimateCardioCals(p.cardio_type, p.cardio_duration_min || 0);
      await createActivity(userId, "cardio",
        `${capitalise(p.cardio_type)}${p.cardio_distance_km ? ` — ${p.cardio_distance_km}km` : ""}`,
        `${capitalise(p.cardio_type)} session${p.cardio_duration_min ? ` for ${p.cardio_duration_min} minutes` : ""}. ~${calBurned} kcal.`);
      await updateWeeklyProgress(userId, today, {
        calories_burned: calBurned, workout_duration: p.cardio_duration_min || 0, workouts_completed: 1,
      });
      await recordChatLog(userId, today, "cardio", cardioKey, { ...p });
      result.activity = true;
    }
  }
  return result;
}

function capitalise(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function estimateCardioCals(type: string, durationMin: number) {
  const metMap: Record<string, number> = {
    running: 9.8, jogging: 7.0, cycling: 7.5, swimming: 6.0,
    walking: 3.5, hiit: 10.0, rowing: 7.0, skipping: 10.0, elliptical: 5.0, jump_rope: 10.0,
  };
  const met = metMap[type.toLowerCase()] || 6.0;
  return Math.round((met * 3.5 * 70 * durationMin) / 200);
}

function cleanAILeaks(text: string): string {
  let cleaned = text;
  // Remove parenthesized or bracketed text referencing JSON or database
  cleaned = cleaned.replace(/\([^)]*(?:json|database|schema|instruction|prompt)[^)]*\)/gi, "");
  cleaned = cleaned.replace(/\[[^\]]*(?:json|database|schema|instruction|prompt)[^\]]*\]/gi, "");
  
  // Remove standalone sentences or phrases that mention updating the JSON block or database
  cleaned = cleaned.replace(/(?:remember,?\s+)?i'll\s+update\s+the\s+json\s+block[^\.!\?]*[\.!\?]/gi, "");
  cleaned = cleaned.replace(/i\s+will\s+update\s+the\s+json\s+block[^\.!\?]*[\.!\?]/gi, "");
  cleaned = cleaned.replace(/note:\s*[^\.!\?]*json\s+block[^\.!\?]*[\.!\?]/gi, "");
  
  return cleaned
    .split('\n')
    .filter(line => !/json\s+block/i.test(line) && !/json\s+schema/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseAndApplyAIData(rawAIContent: string, userId: number, user: any) {
  const updates = { userProfile: false, progress: false, plans: false, hydration: false, weight: false, activity: false, macros: false };
  let cleanedText = rawAIContent;
  let newProfileContext: string | undefined;

  const jsonMatch = rawAIContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!jsonMatch) {
    cleanedText = cleanAILeaks(cleanedText);
    return { cleanedText, updates };
  }

  cleanedText = rawAIContent.replace(/```(?:json)?\s*[\s\S]*?\s*```/gi, "").trim();
  cleanedText = cleanAILeaks(cleanedText);
  let parsed: any;
  try { parsed = JSON.parse(jsonMatch[1]); }
  catch (e) { console.error("[aiDataParser] Failed to parse AI JSON:", e); return { cleanedText, updates }; }

  console.log("[aiDataParser] Extracted data for user", userId);
  try {
    if (parsed.profile_update) updates.userProfile = await handleProfileUpdate(userId, parsed.profile_update);
    if (parsed.memory) { newProfileContext = await handleMemory(userId, parsed.memory, user.profile_context || ""); updates.userProfile = true; }
    if (parsed.macro_goals) { updates.macros = await handleMacroGoals(userId, parsed.macro_goals); updates.userProfile = true; }
    if (parsed.workout_plan || parsed.diet_plan) updates.plans = await handlePlans(userId, parsed.workout_plan, parsed.diet_plan);
    if (parsed.progress_log) {
      const sub = await handleProgressLog(userId, parsed.progress_log);
      if (sub.progress) updates.progress = true;
      if (sub.hydration) updates.hydration = true;
      if (sub.weight) updates.weight = true;
      if (sub.activity) updates.activity = true;
    }
  } catch (err: any) { console.error("[aiDataParser] Error processing AI data:", err.message); }
  return { cleanedText, updates, newProfileContext };
}
