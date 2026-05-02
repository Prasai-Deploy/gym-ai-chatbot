/**
 * routes/gamification.routes.ts
 * Streak, badge, and leaderboard API endpoints.
 */
import { Router, Request, Response } from "express";
import pool from "../db.js";
import {
  touchStreak,
  getStreak,
  checkAndAwardBadges,
  getUserBadges,
  getStreakLeaderboard,
  BADGE_CATALOGUE,
} from "../services/gamification.service.js";

const router = Router();

function userId(req: Request, res: Response): number | null {
  const u = (req as any).user;
  if (!u) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return u.id;
}

async function dbGet(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await pool.execute(sql, params);
  return (rows as any[])[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gamification/touch
// Called when user opens app — updates streak, returns new badges
// ─────────────────────────────────────────────────────────────────────────────
router.post("/touch", async (req, res) => {
  const uid = userId(req, res);
  if (!uid) return;
  try {
    const streakData = await touchStreak(uid);

    // Award streak badges
    const newBadges = await checkAndAwardBadges(uid, {
      streak: streakData.current_streak,
    });

    res.json({ ...streakData, newBadges });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamification/streak
// ─────────────────────────────────────────────────────────────────────────────
router.get("/streak", async (req, res) => {
  const uid = userId(req, res);
  if (!uid) return;
  try {
    const data = await getStreak(uid);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamification/badges
// Returns earned + all catalogue badges for display
// ─────────────────────────────────────────────────────────────────────────────
router.get("/badges", async (req, res) => {
  const uid = userId(req, res);
  if (!uid) return;
  try {
    const earned = await getUserBadges(uid);
    const earnedMap = Object.fromEntries(earned.map((b) => [b.badge_key, b.earned_at]));

    const badges = BADGE_CATALOGUE.map((badge) => ({
      ...badge,
      earned: !!earnedMap[badge.key],
      earned_at: earnedMap[badge.key] ?? null,
    }));

    res.json({ badges, totalEarned: earned.length, total: BADGE_CATALOGUE.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gamification/award
// Internal trigger: award badges based on event type
// Body: { trigger: 'first_chat' | 'first_workout' | 'goal_setter' | 'early_bird' }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/award", async (req, res) => {
  const uid = userId(req, res);
  if (!uid) return;
  const { trigger } = req.body;

  try {
    let triggers: any = {};

    if (trigger === "first_chat") {
      // Check if they have any prior chat — if this is truly first
      triggers.firstChat = true;
    } else if (trigger === "first_workout") {
      const [countRow] = await pool.execute(
        "SELECT COUNT(*) AS total FROM workout_logs WHERE user_id = ?",
        [uid]
      );
      const count = (countRow as any[])[0]?.total ?? 0;
      triggers.firstWorkout = count <= 1;
      triggers.workoutCount = count;

      // Check early bird
      const hour = new Date().getHours();
      if (hour < 8) triggers.earlyBird = true;
    } else if (trigger === "goal_setter") {
      triggers.goalSetter = true;
    } else if (trigger === "nutrition_log") {
      // Count consecutive days
      const rows: any[] = (await pool.execute(
        `SELECT date FROM nutrition_logs WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
        [uid]
      ) as any[])[0];
      let consecutive = 0;
      for (let i = 0; i < rows.length; i++) {
        const d = new Date(rows[i].date);
        const expected = new Date();
        expected.setDate(expected.getDate() - i);
        if (d.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
          consecutive++;
        } else break;
      }
      triggers.nutritionConsecutiveDays = consecutive;
    }

    const newBadges = await checkAndAwardBadges(uid, triggers);
    res.json({ newBadges });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamification/leaderboard
// ─────────────────────────────────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
  try {
    const board = await getStreakLeaderboard();
    const uid = (req as any).user?.id ?? null;
    const withHighlight = board.map((row) => ({ ...row, isMe: row.user_id === uid }));
    res.json(withHighlight);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
