import { buildDashboardSummary, logMetrics, } from "../services/dashboard.service.js";
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
