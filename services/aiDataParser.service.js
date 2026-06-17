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
import { upsertProfile } from "./profile.service.js";
import { addWaterIntake, setHydrationGoal } from "./water.service.js";
import { createActivity } from "./activity.service.js";
import { logMeal, updateDailyProgress, saveAIWorkout, saveAIDiet, linkActivePlans } from "./plan.service.js";
import { updateWeeklyProgress } from "./progress.service.js";
// ─────────────────────────────────────────────────────────────────────────────
// DB Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function dbGet(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows[0] ?? null;
    }
    catch {
        return null;
    }
}
async function dbRun(sql, params = []) {
    try {
        const [result] = await pool.execute(sql, params);
        const r = result;
        return { insertId: r.insertId, affectedRows: r.affectedRows };
    }
    catch (err) {
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
async function isDuplicateToday(userId, date, dataType, dataKey) {
    if (!dataKey)
        return false;
    const row = await dbGet(`SELECT id FROM ai_chat_logs 
     WHERE user_id = ? AND date = ? AND data_type = ? AND data_key = ?
     LIMIT 1`, [userId, date, dataType, dataKey]);
    return !!row;
}
/**
 * Records that we processed a particular data type/key today (for dedup).
 */
async function recordChatLog(userId, date, dataType, dataKey, dataJson) {
    try {
        await dbRun(`INSERT INTO ai_chat_logs (user_id, date, data_type, data_key, data_json)
       VALUES (?, ?, ?, ?, ?)`, [userId, date, dataType, dataKey, JSON.stringify(dataJson)]);
    }
    catch {
        // Non-fatal — dedup logging failure should not block the main write
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Sub-handlers
// ─────────────────────────────────────────────────────────────────────────────
/** Handles profile_update key */
async function handleProfileUpdate(userId, data) {
    if (!data || Object.keys(data).length === 0)
        return false;
    await upsertProfile(userId, data);
    console.log("[aiDataParser] Profile updated for user", userId, ":", data);
    return true;
}
/** Handles memory key — appends to users.profile_context */
async function handleMemory(userId, memory, currentContext) {
    const newContext = (currentContext ? currentContext + "\n" : "") + "- " + memory;
    await dbRun("UPDATE users SET profile_context = ? WHERE id = ?", [newContext, userId]);
    console.log("[aiDataParser] Memory saved for user", userId, ":", memory);
    return newContext;
}
/** Handles macro_goals key */
async function handleMacroGoals(userId, mg) {
    await dbRun("UPDATE users SET calorie_goal = ?, protein_goal = ?, carb_goal = ?, fat_goal = ? WHERE id = ?", [mg.calories || 0, mg.protein || 0, mg.carbs || 0, mg.fats || 0, userId]);
    console.log("[aiDataParser] Macro goals updated for user", userId, ":", mg);
    return true;
}
/** Handles workout_plan and/or diet_plan keys */
/**
 * Parse a markdown workout plan string into structured exercises.
 * Handles formats like:
 *   - "Bench Press: 4 sets x 8-10 reps @ 70 kg"
 *   - "| Bench Press | 4 | 8-10 | 70 kg |"
 *   - Numbered lists: "1. Bench Press — 3 sets × 10 reps"
 */
function parseMarkdownExercises(markdown) {
    const exercises = [];
    const lines = markdown.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---'))
            continue;
        // Pattern 1: Markdown table row: | Exercise | Sets | Reps | Weight |
        const tableMatch = trimmed.match(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([\d-+]+)\s*\|\s*([^|]*)\s*\|/);
        if (tableMatch) {
            const name = tableMatch[1].replace(/\*\*/g, '').trim();
            if (name.toLowerCase() === 'exercise' || name.toLowerCase() === '---')
                continue;
            exercises.push({
                name,
                sets: parseInt(tableMatch[2]) || 3,
                reps: tableMatch[3].trim() || '10',
                weight: tableMatch[4].replace(/\*\*/g, '').trim() || 'bodyweight',
            });
            continue;
        }
        // Pattern 2: "Name: N sets × R reps @ W kg"
        const colonMatch = trimmed.match(/^(?:\d+\.\s*)?([A-Z][\w\s]+?):\s*(\d+)\s*(?:sets?|x|×)?[\s×x]+(\d[\d-+]*)\s*(?:reps?)?(?:.*?@\s*([\d.]+\s*kg))?/i);
        if (colonMatch) {
            exercises.push({
                name: colonMatch[1].replace(/\*\*/g, '').trim(),
                sets: parseInt(colonMatch[2]) || 3,
                reps: colonMatch[3].trim() || '10',
                weight: colonMatch[4]?.trim() || 'bodyweight',
            });
            continue;
        }
        // Pattern 3: "- **Name** — N sets × R reps"
        const dashMatch = trimmed.match(/^[-•*]\s*\*{0,2}([A-Z][\w\s]+?)\*{0,2}\s*[—-]\s*(\d+)\s*(?:sets?|x|×)[\s×x]+(\d[\d-+]*)\s*(?:reps?)?/i);
        if (dashMatch) {
            exercises.push({
                name: dashMatch[1].trim(),
                sets: parseInt(dashMatch[2]) || 3,
                reps: dashMatch[3].trim() || '10',
                weight: 'bodyweight',
            });
            continue;
        }
        // Pattern 4: Numbered list item with exercise name (fallback — no sets info)
        const numberedMatch = trimmed.match(/^\d+\.\s+\*{0,2}([A-Z][\w\s]{3,40}?)\*{0,2}\s*$/);
        if (numberedMatch && exercises.length < 12) {
            exercises.push({
                name: numberedMatch[1].trim(),
                sets: 3,
                reps: '10-12',
                weight: 'bodyweight',
            });
        }
    }
    return exercises.filter(e => e.name.length > 2 && e.name.length < 60);
}
async function handlePlans(userId, workoutPlan, dietPlan) {
    const today = new Date().toISOString().split("T")[0];
    const formattedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date());
    // 1. Legacy daily_plans table
    await dbRun(`INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed) 
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE workout_plan = VALUES(workout_plan), diet_plan = VALUES(diet_plan)`, [userId, formattedDate, workoutPlan ? (typeof workoutPlan === "string" ? workoutPlan : JSON.stringify(workoutPlan)) : "", dietPlan ? (typeof dietPlan === "string" ? dietPlan : JSON.stringify(dietPlan)) : ""]);
    // 2. Structured tables
    let workoutId;
    let dietId;
    if (workoutPlan) {
        let workoutObj;
        let parsedExercises = [];
        if (typeof workoutPlan === "string") {
            // Parse markdown into structured exercises
            parsedExercises = parseMarkdownExercises(workoutPlan);
            workoutObj = {
                title: "Today's Workout",
                exercises: parsedExercises.length > 0
                    ? parsedExercises
                    : [{ name: "AI Workout", description: workoutPlan }],
                duration: "45 min",
                difficulty: "Moderate",
                calories_estimate: 0,
            };
        }
        else {
            workoutObj = workoutPlan;
            parsedExercises = workoutPlan.exercises || [];
        }
        workoutId = await saveAIWorkout(userId, workoutObj);
        // 3. Also save to workout_plans table so WorkoutTracker can link sessions
        if (parsedExercises.length > 0) {
            // Upsert into workout_plans (ON DUPLICATE KEY handles same-day re-generation)
            await dbRun(`INSERT INTO workout_plans (user_id, date, focus, duration, exercises, calories_estimate, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           focus = VALUES(focus),
           exercises = VALUES(exercises),
           calories_estimate = VALUES(calories_estimate)`, [
                userId,
                today,
                workoutObj.title || "Today's Workout",
                workoutObj.duration || "45 min",
                JSON.stringify(parsedExercises),
                workoutObj.calories_estimate || 0,
                workoutObj.difficulty || "Moderate",
            ]);
            console.log(`[aiDataParser] Saved ${parsedExercises.length} exercises to workout_plans for user ${userId}`);
        }
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
        await createActivity(userId, "chatbot", "AI Plan Generated", `Coach generated a new ${workoutPlan ? "workout" : "diet"} plan and set your hydration target to ${hydrationGoal / 1000}L.`);
    }
    console.log("[aiDataParser] Plans saved for user", userId);
    return true;
}
/** Handles the progress_log key — the most complex handler */
async function handleProgressLog(userId, p, profileWeightKg) {
    const result = { progress: false, hydration: false, weight: false, activity: false };
    const today = new Date().toISOString().split("T")[0];
    // ── Normalise field aliases ───────────────────────────────────────────────
    const caloriesConsumed = p.calories_consumed ?? p.calories ?? 0;
    const caloriesBurned = p.calories_burned ?? 0;
    const protein = p.protein ?? p.protein_g ?? 0;
    const carbs = p.carbs ?? 0;
    const fats = p.fats ?? 0;
    const waterMl = p.water_ml ?? (p.water ? p.water * 1000 : 0); // p.water legacy = litres
    const bodyWeightKg = p.body_weight_kg ?? null;
    const workoutName = p.workout_name || null;
    const workoutCompleted = p.workout_completed ?? (!!workoutName);
    const muscleGroup = p.muscle_group || null;
    // ── 1. Workout / Progress log ─────────────────────────────────────────────
    if (workoutName || caloriesConsumed || protein || carbs || fats) {
        const dupKey = workoutName || (caloriesConsumed ? `cal_${caloriesConsumed}` : null);
        const isDup = await isDuplicateToday(userId, today, "workout", dupKey);
        if (!isDup) {
            // Legacy progress table
            await dbRun(`INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userId, today, workoutName || "AI Log", caloriesConsumed, protein, Math.round(waterMl / 1000), carbs, fats]);
            // New user_progress (with macro columns from migration 008)
            await updateDailyProgress(userId, today, {
                calories_consumed: caloriesConsumed,
                calories_burned: caloriesBurned,
                water_ml: waterMl,
                protein,
                carbs,
                fats,
                weight_kg: bodyWeightKg,
            });
            // Meal tracking (nutrition entries)
            const foodItem = p.food_item || workoutName || "AI Log";
            if (caloriesConsumed || protein) {
                await logMeal(userId, today, {
                    meal_type: "AI Log",
                    food_item: foodItem,
                    calories: caloriesConsumed,
                    protein,
                    carbs,
                    fats,
                });
            }
            // Weekly progress sync
            if (workoutCompleted || caloriesBurned) {
                await updateWeeklyProgress(userId, today, {
                    workouts_completed: workoutCompleted ? 1 : 0,
                    exercises_completed: p.exercises?.length || 0,
                    calories_burned: caloriesBurned,
                    diet_completion: caloriesConsumed ? 25 : 0,
                });
            }
            // Workout-specific exercise logs
            if (p.exercises && p.exercises.length > 0) {
                for (const ex of p.exercises) {
                    await dbRun(`INSERT INTO workout_logs (user_id, date, exercise_name, sets_done, reps_done, weight_used)
             VALUES (?, ?, ?, ?, ?, ?)`, [userId, today, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null]);
                }
            }
            // Activity feed entry
            if (workoutCompleted && workoutName) {
                await createActivity(userId, "chat", `Workout Logged: ${workoutName}${muscleGroup ? ` (${muscleGroup})` : ""}`, `AI auto-logged your ${workoutName}${p.exercises?.length ? ` — ${p.exercises.length} exercises tracked` : ""}.`);
            }
            await recordChatLog(userId, today, "workout", dupKey, { workoutName, caloriesConsumed, protein, carbs, fats });
            result.progress = true;
        }
        else {
            console.log(`[aiDataParser] Duplicate workout/nutrition log skipped for user ${userId}: "${dupKey}"`);
        }
    }
    // ── 2. Hydration ──────────────────────────────────────────────────────────
    if (waterMl > 0) {
        // Water is accumulative — no duplicate check, always add
        await addWaterIntake(userId, waterMl, "ai");
        await createActivity(userId, "chat", `Water Logged: ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"}`, `AI auto-logged ${waterMl >= 1000 ? (waterMl / 1000).toFixed(1) + "L" : waterMl + "ml"} of water intake.`);
        result.hydration = true;
    }
    // ── 3. Body weight ────────────────────────────────────────────────────────
    if (bodyWeightKg && bodyWeightKg > 0) {
        // progress_logs has UNIQUE KEY (user_id, date), so ON DUPLICATE KEY handles dedup
        await dbRun(`INSERT INTO progress_logs (user_id, date, weight_kg)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`, [userId, today, bodyWeightKg]);
        // Also update fitness_profiles.weight_kg for context
        await dbRun(`INSERT INTO fitness_profiles (user_id, weight_kg)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`, [userId, bodyWeightKg]);
        await createActivity(userId, "chat", `Weight Logged: ${bodyWeightKg}kg`, `AI auto-logged your body weight as ${bodyWeightKg}kg.`);
        result.weight = true;
    }
    // ── 4. Cardio ─────────────────────────────────────────────────────────────
    if (p.cardio_type) {
        const cardioKey = `${p.cardio_type}_${today}`;
        const isDupCardio = await isDuplicateToday(userId, today, "cardio", cardioKey);
        if (!isDupCardio) {
            const calBurned = p.calories_burned || estimateCardioCals(p.cardio_type, p.cardio_duration_min || 0);
            await createActivity(userId, "cardio", `${capitalise(p.cardio_type)}${p.cardio_distance_km ? ` — ${p.cardio_distance_km}km` : ""}`, `${capitalise(p.cardio_type)} session${p.cardio_duration_min ? ` for ${p.cardio_duration_min} minutes` : ""}${p.cardio_distance_km ? `, ${p.cardio_distance_km}km` : ""}. ~${calBurned} kcal burned.`);
            await updateWeeklyProgress(userId, today, {
                calories_burned: calBurned,
                workout_duration: p.cardio_duration_min || 0,
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
function capitalise(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
 * Rough MET-based calorie estimate for common cardio types.
 * Formula: MET × 3.5 × weight_kg × duration_min / 200
 * (defaults to 70kg if no profile weight available)
 */
function estimateCardioCals(type, durationMin) {
    const metMap = {
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
export async function parseAndApplyAIData(rawAIContent, userId, user) {
    const updates = {
        userProfile: false,
        progress: false,
        plans: false,
        hydration: false,
        weight: false,
        activity: false,
        macros: false,
    };
    let cleanedText = rawAIContent;
    let newProfileContext;
    // ── Extract JSON block ─────────────────────────────────────────────────────
    // Match ```json ... ``` or ``` ... ``` blocks
    const jsonMatch = rawAIContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) {
        return { cleanedText, updates };
    }
    // Strip the JSON block from the user-visible text
    cleanedText = rawAIContent.replace(/```(?:json)?\s*[\s\S]*?\s*```/gi, "").trim();
    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[1]);
    }
    catch (e) {
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
            if (subResults.progress)
                updates.progress = true;
            if (subResults.hydration)
                updates.hydration = true;
            if (subResults.weight)
                updates.weight = true;
            if (subResults.activity)
                updates.activity = true;
        }
    }
    catch (err) {
        console.error("[aiDataParser] Error processing AI data:", err.message);
        // Return partial updates — don't let a DB error kill the whole chat response
    }
    return { cleanedText, updates, newProfileContext };
}
