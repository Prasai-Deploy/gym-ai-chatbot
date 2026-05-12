/**
 * controllers/workout.controller.ts
 * HTTP handlers for the workout generator API.
 *
 *  POST /api/workout/generate  → generate today's workout plan via AI
 *  GET  /api/workout/:userId   → fetch the latest saved plan
 *  POST /api/workout/log       → save completed exercise logs
 */
import { Request, Response } from "express";
import { getProfile, isProfileComplete } from "../services/profile.service.js";
import {
  getLatestPlan,
  getPlanByDate,
  savePlan,
  saveLogs,
  getLastLog,
  getRecentFocuses,
  WorkoutLogEntry,
  startSession,
  updateSessionProgress,
  completeSession,
  getTodaySession,
  getWorkoutHistory,
} from "../services/workout.service.js";
import { getLatestActivePlan } from "../services/plan.service.js";
import {
  decideSplit,
  buildWorkoutPrompt,
  callWorkoutAI,
  ExerciseHistory,
} from "../services/workoutAI.service.js";
import pool from "../db.js";
import { ResultSetHeader } from "mysql2/promise";

// ─────────────────────────────────────────────────────────────────────────────
// Shared auth guard
// ─────────────────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response): Express.User | null {
  const user = (req as any).user as Express.User | undefined;
  if (!user) {
    res.status(401).json({ error: "Unauthorized — please log in." });
    return null;
  }
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: ensure a workout_plans row exists and return its id
// This bridges the gap between chatbot_generated_workouts and workout_sessions FK
// ─────────────────────────────────────────────────────────────────────────────

async function ensureWorkoutPlanRow(
  userId: number,
  activePlan: any
): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  // 1. Check if a workout_plans row already exists for today
  const [existingRows] = await pool.execute(
    "SELECT id FROM workout_plans WHERE user_id = ? AND date = ?",
    [userId, today]
  );
  const existing = (existingRows as any[])[0];
  if (existing) return existing.id;

  // 2. No row — create one from the chatbot_generated_workouts data
  const exercises = activePlan.workout_exercises || [];
  const [result] = await pool.execute(
    `INSERT INTO workout_plans (user_id, date, focus, duration, exercises, calories_estimate, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      today,
      activePlan.workout_title || "Today's Workout",
      activePlan.duration || "45 min",
      JSON.stringify(exercises),
      activePlan.calories_estimate || 0,
      activePlan.difficulty || "Moderate",
    ]
  );
  return (result as ResultSetHeader).insertId;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/generate
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWorkoutHandler(
  req: Request,
  res: Response
): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    // ── 1. Load fitness profile ────────────────────────────────────────────
    const profile = await getProfile(user.id);

    if (!profile || !isProfileComplete(profile)) {
      res.status(400).json({
        error:
          "Your fitness profile is incomplete. Please fill in your goal, workout days, activity level, weight, height, age, and diet type before generating a workout.",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // ── 2. Check if a plan already exists for today ───────────────────────
    const existingPlan = await getPlanByDate(user.id, today);
    if (existingPlan) {
      // Parse exercises JSON if stored as string
      const exercises =
        typeof existingPlan.exercises === "string"
          ? JSON.parse(existingPlan.exercises)
          : existingPlan.exercises;

      res.json({
        plan: { ...existingPlan, exercises },
        cached: true,
        message: "Returning today's existing plan.",
      });
      return;
    }

    // ── 3. Determine today's split ─────────────────────────────────────────
    const recentFocuses = await getRecentFocuses(user.id, 4);
    const todayFocus    = decideSplit(profile.workout_days ?? 3, recentFocuses);

    // ── 4. Build progressive overload map for common exercises ─────────────
    // We prime the map with the last 8 exercises from the most recent plan
    const lastPlan = await getLatestPlan(user.id);
    const historyMap = new Map<string, ExerciseHistory>();

    if (lastPlan) {
      const lastExercises: any[] =
        typeof lastPlan.exercises === "string"
          ? JSON.parse(lastPlan.exercises)
          : lastPlan.exercises;

      await Promise.all(
        lastExercises.slice(0, 8).map(async (ex: any) => {
          const log = await getLastLog(user.id, ex.name);
          if (log) {
            historyMap.set(ex.name, {
              name:        ex.name,
              weight_used: log.weight_used,
              reps_done:   log.reps_done,
              difficulty:  log.difficulty,
            });
          }
        })
      );
    }

    // ── 5. Build prompt and call AI ───────────────────────────────────────
    const prompt = buildWorkoutPrompt(profile, todayFocus, recentFocuses, historyMap);
    let generatedPlan;

    try {
      generatedPlan = await callWorkoutAI(prompt);
    } catch (aiError: any) {
      console.error("[Workout] AI generation failed:", aiError.message);

      // Graceful degradation: return last saved plan if one exists
      if (lastPlan) {
        const exercises =
          typeof lastPlan.exercises === "string"
            ? JSON.parse(lastPlan.exercises)
            : lastPlan.exercises;
        res.status(200).json({
          plan: { ...lastPlan, exercises },
          cached: true,
          warning: `AI unavailable — returning last saved plan.`,
        });
        return;
      }

      res.status(503).json({
        error: `Workout generation failed due to high server traffic. Please try again.`,
      });
      return;
    }

    // ── 6. Persist and return ─────────────────────────────────────────────
    const savedPlan = await savePlan(user.id, today, generatedPlan, prompt);
    const exercises =
      typeof savedPlan.exercises === "string"
        ? JSON.parse(savedPlan.exercises)
        : savedPlan.exercises;

    res.json({
      plan: { ...savedPlan, exercises },
      cached: false,
    });
  } catch (e: any) {
    console.error("[Workout] generateWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workout/:userId
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorkoutHandler(
  req: Request,
  res: Response
): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const requestedId = parseInt(req.params.userId, 10);
  if (user.id !== requestedId) {
    res.status(403).json({ error: "Forbidden — you can only access your own plans." });
    return;
  }

  try {
    const plan = await getLatestPlan(user.id);

    if (!plan) {
      res.status(404).json({ plan: null, message: "No workout plan found. Generate one first!" });
      return;
    }

    const exercises =
      typeof plan.exercises === "string"
        ? JSON.parse(plan.exercises)
        : plan.exercises;

    res.json({ plan: { ...plan, exercises } });
  } catch (e: any) {
    console.error("[Workout] getWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/log
// ─────────────────────────────────────────────────────────────────────────────

export async function logWorkoutHandler(
  req: Request,
  res: Response
): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const { plan_id, date, exercises } = req.body as {
    plan_id?:  number;
    date?:     string;
    exercises: WorkoutLogEntry[];
  };

  if (!Array.isArray(exercises) || exercises.length === 0) {
    res.status(400).json({ error: "exercises array is required and must not be empty." });
    return;
  }

  const logDate = date ?? new Date().toISOString().split("T")[0];

  try {
    await saveLogs(user.id, plan_id ?? null, logDate, exercises);

    res.json({
      success: true,
      logged:  exercises.length,
      date:    logDate,
    });
  } catch (e: any) {
    console.error("[Workout] logWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workout/today
// Returns today's workout plan + active session (if any).
// Priority: workout_plans table (has an ID valid for session FK) > activePlan from new tables
// ─────────────────────────────────────────────────────────────────────────────

export async function getTodayWorkoutHandler(req: Request, res: Response): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Always try workout_plans first — this has a valid ID for FK in workout_sessions
    let plan = await getPlanByDate(user.id, today);

    // 2. If no workout_plans row today, try the newer chatbot_generated_workouts path
    if (!plan) {
      const activePlan = await getLatestActivePlan(user.id);
      if (activePlan && activePlan.workout_title) {
        // Ensure a workout_plans row is created (needed for the FK in workout_sessions)
        const workoutPlanId = await ensureWorkoutPlanRow(user.id, activePlan);

        // Re-fetch the newly created row so we have a real DB object
        plan = await getPlanByDate(user.id, today);

        // Fallback if refetch somehow fails — construct a minimal plan
        if (!plan) {
          plan = {
            id: workoutPlanId,
            focus: activePlan.workout_title,
            duration: activePlan.duration || "45 min",
            difficulty: activePlan.difficulty || "Moderate",
            exercises: activePlan.workout_exercises || [],
            calories_estimate: activePlan.calories_estimate || 0,
          };
        }
      }
    }

    if (!plan) {
      res.status(404).json({ plan: null, session: null, message: "No workout plan for today." });
      return;
    }

    const exercises = typeof plan.exercises === "string"
      ? JSON.parse(plan.exercises)
      : plan.exercises;

    // 3. Fetch active session for today
    const session = await getTodaySession(user.id);

    res.json({
      plan: { ...plan, exercises },
      session: session
        ? {
            ...session,
            completed_exercises:
              typeof session.completed_exercises === "string"
                ? JSON.parse(session.completed_exercises)
                : (session.completed_exercises || []),
          }
        : null,
    });
  } catch (e: any) {
    console.error("[Workout] getTodayWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/start
// ─────────────────────────────────────────────────────────────────────────────

export async function startWorkoutHandler(req: Request, res: Response): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const { plan_id } = req.body;
  if (!plan_id) {
    res.status(400).json({ error: "plan_id is required." });
    return;
  }

  try {
    // Verify the plan_id belongs to this user and exists in workout_plans
    const [planRows] = await pool.execute(
      "SELECT id FROM workout_plans WHERE id = ? AND user_id = ?",
      [plan_id, user.id]
    );

    if ((planRows as any[]).length === 0) {
      // plan_id not found in workout_plans — try to find today's plan and use that instead
      const today = new Date().toISOString().split("T")[0];
      const todayPlan = await getPlanByDate(user.id, today);

      if (!todayPlan) {
        res.status(404).json({ error: "No workout plan found for today. Please generate one first." });
        return;
      }

      // Cancel any previously active session for this user
      await pool.execute(
        "UPDATE workout_sessions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
        [user.id]
      );

      const session = await startSession(user.id, todayPlan.id);
      res.json({ success: true, session });
      return;
    }

    // Cancel any previously active session for this user before starting a new one
    await pool.execute(
      "UPDATE workout_sessions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
      [user.id]
    );

    const session = await startSession(user.id, plan_id);
    res.json({ success: true, session });
  } catch (e: any) {
    console.error("[Workout] startWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/progress
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProgressHandler(req: Request, res: Response): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const { session_id, completed_exercises, progress_percentage, calories_burned } = req.body;

  if (!session_id) {
    res.status(400).json({ error: "session_id is required." });
    return;
  }

  try {
    await updateSessionProgress(
      session_id,
      completed_exercises || [],
      progress_percentage || 0,
      calories_burned || 0
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error("[Workout] updateProgressHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/complete
// ─────────────────────────────────────────────────────────────────────────────

export async function completeWorkoutHandler(req: Request, res: Response): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  const { session_id } = req.body;
  if (!session_id) {
    res.status(400).json({ error: "session_id is required." });
    return;
  }

  try {
    await completeSession(session_id);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[Workout] completeWorkoutHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workout/history
// ─────────────────────────────────────────────────────────────────────────────

export async function getHistoryHandler(req: Request, res: Response): Promise<void> {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const history = await getWorkoutHistory(user.id);
    res.json({ history });
  } catch (e: any) {
    console.error("[Workout] getHistoryHandler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
