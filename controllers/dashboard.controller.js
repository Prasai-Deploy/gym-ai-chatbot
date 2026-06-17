import { buildDashboardSummary, logMetrics, } from "../services/dashboard.service.js";
import { saveAIWorkout, saveAIDiet, linkActivePlans, getLatestActivePlan, getPlanHistory, updateDailyProgress } from "../services/plan.service.js";
// ─────────────────────────────────────────────────────────────────────────────
// Auth guard
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
// GET /api/dashboard/:userId
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    const requestedId = parseInt(req.params.userId, 10);
    if (isNaN(requestedId) || user.id !== requestedId) {
        res.status(403).json({ error: "Forbidden — you can only access your own dashboard." });
        return;
    }
    try {
        const data = await buildDashboardSummary(user.id);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(data);
    }
    catch (e) {
        console.error("[Dashboard] getDashboardHandler error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/progress/metrics
// ─────────────────────────────────────────────────────────────────────────────
export async function logMetricsHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    const { date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, notes, } = req.body;
    // At least one metric must be present
    if (weight_kg === undefined &&
        body_fat_pct === undefined &&
        chest_cm === undefined &&
        waist_cm === undefined &&
        hips_cm === undefined) {
        res.status(400).json({
            error: "Provide at least one metric: weight_kg, body_fat_pct, chest_cm, waist_cm, or hips_cm.",
        });
        return;
    }
    try {
        await logMetrics(user.id, {
            date,
            weight_kg,
            body_fat_pct,
            chest_cm,
            waist_cm,
            hips_cm,
            notes,
        });
        res.json({
            success: true,
            date: date ?? new Date().toISOString().split("T")[0],
            logged: {
                weight_kg: weight_kg ?? null,
                body_fat_pct: body_fat_pct ?? null,
                chest_cm: chest_cm ?? null,
                waist_cm: waist_cm ?? null,
                hips_cm: hips_cm ?? null,
            },
        });
    }
    catch (e) {
        console.error("[Dashboard] logMetricsHandler error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/latest-plan
// ─────────────────────────────────────────────────────────────────────────────
export async function getLatestPlanHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    try {
        const plan = await getLatestActivePlan(user.id);
        res.json(plan);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/history
// ─────────────────────────────────────────────────────────────────────────────
export async function getHistoryHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    try {
        const history = await getPlanHistory(user.id);
        res.json(history);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/progress
// ─────────────────────────────────────────────────────────────────────────────
export async function getProgressHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    try {
        // Reusing buildDashboardSummary but we could optimize if needed
        const data = await buildDashboardSummary(user.id);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/dashboard/update
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProgressHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    const { date, ...data } = req.body;
    const targetDate = date || new Date().toISOString().split("T")[0];
    try {
        await updateDailyProgress(user.id, targetDate, data);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chatbot/save-plan
// ─────────────────────────────────────────────────────────────────────────────
export async function saveAIPlanHandler(req, res) {
    const user = requireAuth(req, res);
    if (!user)
        return;
    const { workout, diet, plan_id } = req.body;
    try {
        let workoutId, dietId;
        if (workout) {
            workoutId = await saveAIWorkout(user.id, workout, plan_id);
        }
        if (diet) {
            dietId = await saveAIDiet(user.id, diet, plan_id);
        }
        if (workoutId || dietId) {
            await linkActivePlans(user.id, workoutId, dietId);
        }
        res.json({ success: true, workoutId, dietId });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
