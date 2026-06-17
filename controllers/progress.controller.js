import * as ProgressService from "../services/progress.service.js";
function getUserId(req) {
    return req.user?.id || null;
}
export async function getWeeklyChartHandler(req, res) {
    const userId = getUserId(req);
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const data = await ProgressService.getWeeklyChartData(userId);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function getWeeklySummaryHandler(req, res) {
    const userId = getUserId(req);
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const summary = await ProgressService.getWeeklySummary(userId);
        res.json(summary);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function getDailyStatsHandler(req, res) {
    const userId = getUserId(req);
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const stats = await ProgressService.getDailyStats(userId);
        res.json(stats);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function logManualProgressHandler(req, res) {
    const userId = getUserId(req);
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const result = await ProgressService.logManualProgress(userId, req.body);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
