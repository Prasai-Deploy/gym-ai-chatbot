import { addWaterIntake, updateWaterIntake, deleteWaterIntake, getTodayHydration, getTodayLogs, getHydrationHistory, setHydrationGoal } from "../services/water.service.js";
function requireAuth(req, res) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }
    return user.id;
}
export async function addWaterHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    const { amount, source } = req.body;
    if (!amount || isNaN(amount))
        return res.status(400).json({ error: "Invalid amount" });
    try {
        await addWaterIntake(userId, amount, source);
        const summary = await getTodayHydration(userId);
        res.json({ success: true, summary });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function updateWaterHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    const { id, amount } = req.body;
    try {
        await updateWaterIntake(userId, id, amount);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function deleteWaterHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    const { id } = req.params;
    try {
        await deleteWaterIntake(userId, parseInt(id));
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function getTodayWaterHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    try {
        const summary = await getTodayHydration(userId);
        const logs = await getTodayLogs(userId);
        res.json({ summary, logs });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function getWaterHistoryHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    try {
        const history = await getHydrationHistory(userId);
        res.json(history);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
export async function setWaterGoalHandler(req, res) {
    const userId = requireAuth(req, res);
    if (!userId)
        return;
    const { goal, isAI, reason } = req.body;
    try {
        await setHydrationGoal(userId, goal, isAI, reason);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
