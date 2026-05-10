/**
 * services/aiDataParser.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized AI conversation → fitness data extraction engine.
 *
 * Responsibilities:
 *  1. Parse and validate the JSON block embedded by the AI in every response.
 *  2. Route each extracted field to the correct DB write function.
 *  3. Prevent duplicate same-day entries.
 *  4. Return granular update flags so the frontend knows exactly which
 *     dashboard sections to refresh immediately.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from "../db.js";
import { ResultSetHeader } from "mysql2/promise";
import { upsertProfile } from "./profile.service.js";
import { addWaterIntake, setHydrationGoal } from "./water.service.js";
import { createActivity } from "./activity.service.js";
import { logMeal, updateDailyProgress, saveAIWorkout, saveAIDiet, linkActivePlans } from "./plan.service.js";
import { updateWeeklyProgress } from "./progress.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIExtractedData {
  profile_update?: {
    goal?: string;
    weight_kg?: number;
    height_cm?: number;
    age?: number;
    diet_type?: string;
    activity_level?: string;
    workout_days?: number;
  };
  macro_goals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  workout_plan?: any;
  diet_plan?: any;
  progress_log?: {
    workout_name?: string;
    workout_completed?: boolean;
    muscle_group?: string;
    calories_consumed?: number;
    calories_burned?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    water_ml?: number;
    body_weight_kg?: number;
    cardio_type?: string;
    cardio_duration_min?: number;
    cardio_distance_km?: number;
    exercises?: Array<{
      name: string;
      sets?: number;
      reps?: string;
      weight_kg?: number;
    }>;
    // legacy field aliases the AI might still emit
    calories?: number;
    protein_g?: number;
    water?: number;
    food_item?: string;
  };
  memory?: string;
}

export interface UpdateFlags {
  userProfile: boolean;
  progress: boolean;
  plans: boolean;
  hydration: boolean;
  weight: boolean;
  activity: boolean;
  macros: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function dbGet(sql: string, params: any[] = []): Promise<any> {
  try {
    const [rows] = await pool.execute(sql, params);
    return (rows as any[])[0] ?? null;
  } catch {
    return null;
  }
}

async function dbRun(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
  try {
    const [result] = await pool.execute(sql, params);
    const r = result as ResultSetHeader;
    return { insertId: r.insertId, affectedRows: r.affectedRows };
  } catch (err) {
    console.error("[aiDataParser] dbRun failed:", err);
    return { insertId: 0, affectedRows: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Prevention
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if a log of the given type/key was already saved for this user today.
 */
async function isDuplicateToday(
  userId: number,
  date: string,
  dataType: string,
  dataKey: string | null
): Promise<boolean> {
  if (!dataKey) return false;
  const row = await dbGet(
    `SELECT id FROM ai_chat_logs 
     WHERE user_id = ? AND date = ? AND data_type = ? AND data_key = ?
     LIMIT 1`,
    [userId, date, dataType, dataKey]
  );
  return !!row;
}

/**
 * Records that we processed a particular data type/key today (for dedup).
 */
async function recordChatLog(
  userId: number,
  date: string,
  dataType: string,
  dataKey: string | null,
  dataJson: any
): Promise<void> {
  try {
    await dbRun(
      `INSERT INTO ai_chat_logs (user_id, date, data_type, data_key, data_json)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, date, dataType, dataKey, JSON.stringify(dataJson)]
    );
  } catch {
    // Non-fatal — dedup logging failure should not block the main write
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-handlers
// ─────────────────────────────────────────────────────────────────────────────

/** Handles profile_update key */
async function handleProfileUpdate(userId: number, data: AIExtractedData["profile_update"]): Promise<boolean> {
  if (!data || Object.keys(data).length === 0) return false;
  await upsertProfile(userId, data as any);
  console.log("[aiDataParser] Profile updated for user", userId, ":", data);
  return true;
}

/** Handles memory key — appends to users.profile_context */
async function handleMemory(userId: number, memory: string, currentContext: string): Promise<string> {
  const newContext = (currentContext ? currentContext + "\n" : "") + "- " + memory;
  await dbRun("UPDATE users SET profile_context = ? WHERE id = ?", [newContext, userId]);
  console.log("[aiDataParser] Memory saved for user", userId, ":", memory);
  return newContext;
}

/** Handles macro_goals key */
async function handleMacroGoals(userId: number, mg: NonNullable<AIExtractedData["macro_goals"]>): Promise<boolean> {
  await dbRun(
    "UPDATE users SET calorie_goal = ?, protein_goal = ?, carb_goal = ?, fat_goal = ? WHERE id = ?",
    [mg.calories || 0, mg.protein || 0, mg.carbs || 0, mg.fats || 0, userId]
  );
  console.log("[aiDataParser] Macro goals updated for user", userId, ":", mg);
  return true;
}

/** Handles workout_plan and/or diet_plan keys */
async function handlePlans(
  userId: number,
  workoutPlan: any,
  dietPlan: any
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const formattedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date());

  // 1. Legacy daily_plans table
  await dbRun(
    `INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed) 
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE workout_plan = VALUES(workout_plan), diet_plan = VALUES(diet_plan)`,
    [userId, formattedDate, workoutPlan ? (typeof workoutPlan === "string" ? workoutPlan : JSON.stringify(workoutPlan)) : "", dietPlan ? (typeof dietPlan === "string" ? dietPlan : JSON.stringify(dietPlan)) : ""]
  );

  // 2. Structured tables
  let workoutId: number | undefined;
  let dietId: number | undefined;

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

    // AI Hydration boost on workout plan
    const hydrationGoal = workoutPlan ? 3500 : 2500;
    const reason = workoutPlan
      ? "Increased hydration for your workout day — stay fuelled!"
      : "Standard daily hydration target.";
    await setHydrationGoal(userId, hydrationGoal, true, reason);

    // Activity log
    await createActivity(
      userId,
      "chatbot",
      "AI Plan Generated",
      `Coach generated a new ${workoutPlan ? "workout" : "diet"} plan and set your hydration target to ${hydrationGoal / 1000}L.`
    );
  }

  console.log("[aiDataParser] Plans saved for user", userId);
  return true;
}

/** Handles the progress_log key — the most complex handler */
async function handleProgressLog(
  userId: number,
  p: NonNullable<AIExtractedData["progress_log"]>,
  profileWeightKg: number | null
): Promise<{ progress: boolean; hydration: boolean; weight: boolean; activity: boolean }> {
  const result = { progress: false, hydration: false, weight: false, activity: false };
  const today = new Date().toISOString().split("T")[0];

  // ── Normalise field aliases ───────────────────────────────────────────────
  const caloriesConsumed = p.calories_consumed ?? p.calories ?? 0;
  const caloriesBurned   = p.calories_burned ?? 0;
  const protein          = p.protein ?? p.protein_g ?? 0;
  const carbs            = p.carbs ?? 0;
  const fats             = p.fats ?? 0;
  const waterMl          = p.water_ml ?? (p.water ? p.water * 1000 : 0); // p.water legacy = litres
  const bodyWeightKg     = p.body_weight_kg ?? null;
  const workoutName      = p.workout_name || null;
  const workoutCompleted = p.workout_completed ?? (!!workoutName);
  const muscleGroup      = p.muscle_group || null;

  // ── 1. Workout / Progress log ─────────────────────────────────────────────
  if (workoutName || caloriesConsumed || protein || carbs || fats) {
    const dupKey = workoutName || (caloriesConsumed ? `cal_${caloriesConsumed}` : null);
    const isDup  = await isDuplicateToday(userId, today, "workout", dupKey);

    if (!isDup) {
      // Legacy progress table
      await dbRun(
        `INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, today, workoutName || "AI Log", caloriesConsumed, protein, Math.round(waterMl / 1000), carbs, fats]
      );

      // New user_progress (with macro columns from migration 008)
      await updateDailyProgress(userId, today, {
        calories_consumed: caloriesConsumed,
        calories_burned:   caloriesBurned,
        water_ml:          waterMl,
        protein,
        carbs,
        fats,
        weight_kg:         bodyWeightKg,
      });

      // Meal tracking (nutrition entries)
      const foodItem = (p as any).food_item || workoutName || "AI Log";
      if (caloriesConsumed || protein) {
        await logMeal(userId, today, {
          meal_type:  "AI Log",
          food_item:  foodItem,
          calories:   caloriesConsumed,
          protein,
          carbs,
          fats,
        });
      }

      // Weekly progress sync
      if (workoutCompleted || caloriesBurned) {
        await updateWeeklyProgress(userId, today, {
          workouts_completed:  workoutCompleted ? 1 : 0,
          exercises_completed: p.exercises?.length || 0,
          calories_burned:     caloriesBurned,
          diet_completion:     caloriesConsumed ? 25 : 0,
        });
      }

      // Workout-specific exercise logs
      if (p.exercises && p.exercises.length > 0) {
        for (const ex of p.exercises) {
          await dbRun(
            `INSERT INTO workout_logs (user_id, date, exercise_name, sets_done, reps_done, weight_used)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, today, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null]
          );
        }
      }

      // Activity feed entry
      if (workoutCompleted && workoutName) {
        await createActivity(
          userId,
          "chat",
          `Workout Logged: ${workoutName}${muscleGroup ? ` (${muscleGroup})` : ""}`,
          `AI auto-logged your ${workoutName}${p.exercises?.length ? ` — ${p.exercises.length} exercises tracked` : ""}.`
        );
      }

      await recordChatLog(userId, today, "workout", dupKey, { workoutName, caloriesConsumed, protein, carbs, fats });
      result.progress = true;
    } else {
      console.log(`[aiDataParser] Duplicate workout/nutrition log skipped for user ${userId}: "${dupKey}"`);
    }
  }

  // ── 2. Hydration ──────────────────────────────────────────────────────────
  if (waterMl > 0) {
    // Water is accumulative — no duplicate check, always add
    await addWaterIntake(userId, waterMl, "ai");
    await createActivity(
      userId,
      "chat",
      `Water Logged: ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"}`,
      `AI auto-logged ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"} of water intake.`
    );
    result.hydration = true;
  }

  // ── 3. Body weight ────────────────────────────────────────────────────────
  if (bodyWeightKg && bodyWeightKg > 0) {
    // progress_logs has UNIQUE KEY (user_id, date), so ON DUPLICATE KEY handles dedup
    await dbRun(
      `INSERT INTO progress_logs (user_id, date, weight_kg)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
      [userId, today, bodyWeightKg]
    );
    // Also update fitness_profiles.weight_kg for context
    await dbRun(
      `INSERT INTO fitness_profiles (user_id, weight_kg)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
      [userId, bodyWeightKg]
    );
    await createActivity(
      userId,
      "chat",
      `Weight Logged: ${bodyWeightKg}kg`,
      `AI auto-logged your body weight as ${bodyWeightKg}kg.`
    );
    result.weight = true;
  }

  // ── 4. Cardio ─────────────────────────────────────────────────────────────
  if (p.cardio_type) {
    const cardioKey = `${p.cardio_type}_${today}`;
    const isDupCardio = await isDuplicateToday(userId, today, "cardio", cardioKey);

    if (!isDupCardio) {
      const calBurned = p.calories_burned || estimateCardioCals(p.cardio_type, p.cardio_duration_min || 0);

      await createActivity(
        userId,
        "cardio",
        `${capitalise(p.cardio_type)}${p.cardio_distance_km ? ` — ${p.cardio_distance_km}km` : ""}`,
        `${capitalise(p.cardio_type)} session${p.cardio_duration_min ? ` for ${p.cardio_duration_min} minutes` : ""}${p.cardio_distance_km ? `, ${p.cardio_distance_km}km` : ""}. ~${calBurned} kcal burned.`
      );

      await updateWeeklyProgress(userId, today, {
        calories_burned:    calBurned,
        workout_duration:   p.cardio_duration_min || 0,
        workouts_completed: 1,
      });

      await recordChatLog(userId, today, "cardio", cardioKey, { ...p });
      result.activity = true;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Rough MET-based calorie estimate for common cardio types.
 * Formula: MET × 3.5 × weight_kg × duration_min / 200
 * (defaults to 70kg if no profile weight available)
 */
function estimateCardioCals(type: string, durationMin: number): number {
  const metMap: Record<string, number> = {
    running: 9.8,
    jogging: 7.0,
    cycling: 7.5,
    swimming: 6.0,
    walking: 3.5,
    hiit: 10.0,
    rowing: 7.0,
    skipping: 10.0,
    elliptical: 5.0,
    jump_rope: 10.0,
  };
  const met = metMap[type.toLowerCase()] || 6.0;
  return Math.round((met * 3.5 * 70 * durationMin) / 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses the raw AI response content, extracts the JSON block,
 * validates it, and fans out to all appropriate DB handlers.
 *
 * @param rawAIContent  — the full text returned by the AI (may include JSON block)
 * @param userId        — authenticated user ID
 * @param user          — user object (for profile_context, weight_goal etc.)
 * @returns             — { cleanedText, updates, newProfileContext }
 */
export async function parseAndApplyAIData(
  rawAIContent: string,
  userId: number,
  user: {
    profile_context?: string;
    weight_kg?: number;
  }
): Promise<{
  cleanedText: string;
  updates: UpdateFlags;
  newProfileContext?: string;
}> {
  const updates: UpdateFlags = {
    userProfile: false,
    progress:    false,
    plans:       false,
    hydration:   false,
    weight:      false,
    activity:    false,
    macros:      false,
  };

  let cleanedText = rawAIContent;
  let newProfileContext: string | undefined;

  // ── Extract JSON block ─────────────────────────────────────────────────────
  // Match ```json ... ``` or ``` ... ``` blocks
  const jsonMatch = rawAIContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!jsonMatch) {
    return { cleanedText, updates };
  }

  // Strip the JSON block from the user-visible text
  cleanedText = rawAIContent.replace(/```(?:json)?\s*[\s\S]*?\s*```/gi, "").trim();

  let parsed: AIExtractedData;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch (e) {
    console.error("[aiDataParser] Failed to parse AI JSON block:", e);
    return { cleanedText, updates };
  }

  console.log("[aiDataParser] Extracted data for user", userId, ":", JSON.stringify(parsed, null, 2));

  // ── Fan out to handlers ────────────────────────────────────────────────────
  try {
    // 1. Profile update
    if (parsed.profile_update) {
      updates.userProfile = await handleProfileUpdate(userId, parsed.profile_update);
    }

    // 2. Memory
    if (parsed.memory) {
      newProfileContext = await handleMemory(userId, parsed.memory, user.profile_context || "");
      updates.userProfile = true;
    }

    // 3. Macro goals
    if (parsed.macro_goals) {
      updates.macros = await handleMacroGoals(userId, parsed.macro_goals);
      updates.userProfile = true;
    }

    // 4. Workout + Diet Plans
    if (parsed.workout_plan || parsed.diet_plan) {
      updates.plans = await handlePlans(userId, parsed.workout_plan, parsed.diet_plan);
    }

    // 5. Progress log (most complex — handles workout, nutrition, water, weight, cardio)
    if (parsed.progress_log) {
      const subResults = await handleProgressLog(userId, parsed.progress_log, user.weight_kg || null);
      if (subResults.progress)  updates.progress  = true;
      if (subResults.hydration) updates.hydration = true;
      if (subResults.weight)    updates.weight    = true;
      if (subResults.activity)  updates.activity  = true;
    }
  } catch (err: any) {
    console.error("[aiDataParser] Error processing AI data:", err.message);
    // Return partial updates — don't let a DB error kill the whole chat response
  }

  return { cleanedText, updates, newProfileContext };
}
