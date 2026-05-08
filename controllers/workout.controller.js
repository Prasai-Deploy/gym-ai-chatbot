import { getProfile, isProfileComplete } from "../services/profile.service.js";
import { getLatestPlan, getPlanByDate, savePlan, saveLogs, getLastLog, getRecentFocuses, } from "../services/workout.service.js";
import { decideSplit, buildWorkoutPrompt, callWorkoutAI, } from "../services/workoutAI.service.js";
// ─────────────────────────────────────────────────────────────────────────────
// Shared auth guard
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req, res) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized — please log in." });
        return null;
    }
    return user;
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/generate
// ─────────────────────────────────────────────────────────────────────────────
export async function generateWorkoutHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    try {
        // ── 1. Load fitness profile ────────────────────────────────────────────
        const profile = await getProfile(user.id);
        if (!profile || !isProfileComplete(profile)) {
            res.status(400).json({
                error: "Your fitness profile is incomplete. Please fill in your goal, workout days, activity level, weight, height, age, and diet type before generating a workout.",
            });
            return;
        }
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        // ── 2. Check if a plan already exists for today ───────────────────────
        const existingPlan = await getPlanByDate(user.id, today);
        if (existingPlan) {
            // Parse exercises JSON if stored as string
            const exercises = typeof existingPlan.exercises === "string"
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
        const todayFocus = decideSplit(profile.workout_days ?? 3, recentFocuses);
        // ── 4. Build progressive overload map for common exercises ─────────────
        // We prime the map with the last 8 exercises from the most recent plan
        const lastPlan = await getLatestPlan(user.id);
        const historyMap = new Map();
        if (lastPlan) {
            const lastExercises = typeof lastPlan.exercises === "string"
                ? JSON.parse(lastPlan.exercises)
                : lastPlan.exercises;
            await Promise.all(lastExercises.slice(0, 8).map(async (ex) => {
                const log = await getLastLog(user.id, ex.name);
                if (log) {
                    historyMap.set(ex.name, {
                        name: ex.name,
                        weight_used: log.weight_used,
                        reps_done: log.reps_done,
                        difficulty: log.difficulty,
                    });
                }
            }));
        }
        // ── 5. Build prompt and call AI ───────────────────────────────────────
        const prompt = buildWorkoutPrompt(profile, todayFocus, recentFocuses, historyMap);
        let generatedPlan;
        try {
            generatedPlan = await callWorkoutAI(prompt);
        }
        catch (aiError) {
            console.error("[Workout] AI generation failed:", aiError.message);
            // Graceful degradation: return last saved plan if one exists
            if (lastPlan) {
                const exercises = typeof lastPlan.exercises === "string"
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
        const exercises = typeof savedPlan.exercises === "string"
            ? JSON.parse(savedPlan.exercises)
            : savedPlan.exercises;
        res.json({
            plan: { ...savedPlan, exercises },
            cached: false,
        });
    }
    catch (e) {
        console.error("[Workout] generateWorkoutHandler error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workout/:userId
// ─────────────────────────────────────────────────────────────────────────────
export async function getWorkoutHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
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
        const exercises = typeof plan.exercises === "string"
            ? JSON.parse(plan.exercises)
            : plan.exercises;
        res.json({ plan: { ...plan, exercises } });
    }
    catch (e) {
        console.error("[Workout] getWorkoutHandler error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workout/log
// ─────────────────────────────────────────────────────────────────────────────
export async function logWorkoutHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    const { plan_id, date, exercises } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
        res.status(400).json({ error: "exercises array is required and must not be empty." });
        return;
    }
    const logDate = date ?? new Date().toISOString().split("T")[0];
    try {
        await saveLogs(user.id, plan_id ?? null, logDate, exercises);
        res.json({
            success: true,
            logged: exercises.length,
            date: logDate,
        });
    }
    catch (e) {
        console.error("[Workout] logWorkoutHandler error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
