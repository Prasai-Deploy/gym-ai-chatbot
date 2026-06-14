/**
 * routes/gamification.routes.ts
 * Streak, badge, and leaderboard API endpoints via Supabase client.
 */
import { Router } from "express";
import supabase from "../db.js";
import { touchStreak, getStreak, checkAndAwardBadges, getUserBadges, getStreakLeaderboard, BADGE_CATALOGUE } from "../services/gamification.service.js";
const router = Router();

function userId(req, res) {
    const u = req.user;
    if (!u) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return u.id;
}

router.post("/touch", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    try {
        const streakData = await touchStreak(uid);
        const newBadges = await checkAndAwardBadges(uid, { streak: streakData.current_streak });
        res.json({ ...streakData, newBadges });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/streak", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    try { res.json(await getStreak(uid)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/badges", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    try {
        const earned = await getUserBadges(uid);
        const earnedMap = Object.fromEntries(earned.map((b) => [b.badge_key, b.earned_at]));
        const badges = BADGE_CATALOGUE.map((badge) => ({
            ...badge, earned: !!earnedMap[badge.key], earned_at: earnedMap[badge.key] ?? null,
        }));
        res.json({ badges, totalEarned: earned.length, total: BADGE_CATALOGUE.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/award", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    const { trigger } = req.body;
    try {
        let triggers = {};
        if (trigger === "first_chat") {
            triggers.firstChat = true;
        } else if (trigger === "first_workout") {
            const { data: logs } = await supabase.from("workout_logs").select("id").eq("user_id", uid);
            const count = logs?.length ?? 0;
            triggers.firstWorkout = count <= 1;
            triggers.workoutCount = count;
            if (new Date().getHours() < 8) triggers.earlyBird = true;
        } else if (trigger === "goal_setter") {
            triggers.goalSetter = true;
        } else if (trigger === "nutrition_log") {
            const { data: logs } = await supabase.from("nutrition_logs").select("date").eq("user_id", uid).order("date", { ascending: false }).limit(7);
            let consecutive = 0;
            for (let i = 0; i < (logs || []).length; i++) {
                const d = new Date(logs[i].date);
                const expected = new Date(); expected.setDate(expected.getDate() - i);
                if (d.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) consecutive++;
                else break;
            }
            triggers.nutritionConsecutiveDays = consecutive;
        }
        const newBadges = await checkAndAwardBadges(uid, triggers);
        res.json({ newBadges });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/leaderboard", async (req, res) => {
    try {
        const board = await getStreakLeaderboard();
        const uid = req.user?.id ?? null;
        res.json(board.map((row) => ({ ...row, isMe: row.user_id === uid })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
