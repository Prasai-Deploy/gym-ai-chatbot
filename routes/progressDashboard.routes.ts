/**
 * routes/progressDashboard.routes.ts
 * All API endpoints for the Progress Dashboard page.
 */
import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// ── Auth guard helper ──────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response): number | null {
  const user = (req as any).user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user.id;
}

async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
}
async function dbGet(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await pool.execute(sql, params);
  return (rows as any[])[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/progress/stats
// Returns: streak, monthly workouts, weekly calories, daily avg water
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Monthly workout count from workout_logs
    const [monthlyRow] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM workout_logs
       WHERE user_id = ?
         AND MONTH(date) = MONTH(CURDATE())
         AND YEAR(date) = YEAR(CURDATE())`,
      [userId]
    );
    const workoutsDone = (monthlyRow as any[])[0]?.total ?? 0;

    // Weekly calories burned from user_progress
    const [weekCalRow] = await pool.execute(
      `SELECT COALESCE(SUM(calories_burned), 0) AS total
       FROM user_progress
       WHERE user_id = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    const weeklyCalories = (weekCalRow as any[])[0]?.total ?? 0;

    // Average daily water from user_progress (last 7 days)
    const [waterRow] = await pool.execute(
      `SELECT COALESCE(AVG(water_litres), 0) AS avg_water
       FROM user_progress
       WHERE user_id = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    const avgWater = parseFloat((waterRow as any[])[0]?.avg_water ?? 0).toFixed(1);

    // Streak: count consecutive days from today with activity in user_progress
    const recentDays = await dbAll(
      `SELECT date FROM user_progress
       WHERE user_id = ? AND activity_minutes > 0
       ORDER BY date DESC LIMIT 60`,
      [userId]
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < recentDays.length; i++) {
      const d = new Date(recentDays[i].date);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff === i || (i === 0 && diff <= 1)) streak++;
      else break;
    }

    // Trend vs last week for comparison
    const [lastWeekCalRow] = await pool.execute(
      `SELECT COALESCE(SUM(calories_burned), 0) AS total
       FROM user_progress
       WHERE user_id = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         AND date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    const lastWeekCalories = (lastWeekCalRow as any[])[0]?.total ?? 0;

    res.json({
      streak,
      workoutsDone,
      weeklyCalories,
      avgWater: parseFloat(avgWater),
      caloriesTrend: weeklyCalories >= lastWeekCalories ? "up" : "down",
      waterTrend: parseFloat(avgWater) >= 2.0 ? "up" : "down",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/progress/activity
// Returns 7-day activity data for bar chart
// ─────────────────────────────────────────────────────────────────────────────
router.get("/activity", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Generate 7-day date series and left join with logged data
    const rows = await dbAll(
      `SELECT
         DATE_FORMAT(d.date, '%a') AS day,
         COALESCE(up.activity_minutes, 0) AS minutes
       FROM (
         SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) AS date
         FROM (SELECT 6 n UNION SELECT 5 UNION SELECT 4 UNION SELECT 3
               UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) nums
       ) d
       LEFT JOIN user_progress up ON up.date = d.date AND up.user_id = ?
       ORDER BY d.date ASC`,
      [userId]
    );

    const total = rows.reduce((s: number, r: any) => s + r.minutes, 0);
    const avg = rows.length > 0 ? Math.round(total / rows.length) : 0;

    res.json({ days: rows, average: avg });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/progress/workouts?page=1
// Paginated workout history
// ─────────────────────────────────────────────────────────────────────────────
router.get("/workouts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const rows = await dbAll(
      `SELECT id, workout_name, DATE_FORMAT(date, '%b %d, %Y') AS date,
              duration_minutes, difficulty
       FROM workout_logs
       WHERE user_id = ?
       ORDER BY date DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countRow] = await pool.execute(
      `SELECT COUNT(*) AS total FROM workout_logs WHERE user_id = ?`,
      [userId]
    );
    const total = (countRow as any[])[0]?.total ?? 0;

    res.json({ workouts: rows, total, page, hasMore: offset + limit < total });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/progress/nutrition
// Returns weekly avg macros and user targets from user_profiles
// ─────────────────────────────────────────────────────────────────────────────
router.get("/nutrition", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Weekly averages from nutrition_logs
    const avgRow = await dbGet(
      `SELECT
         COALESCE(AVG(protein_g), 0) AS protein,
         COALESCE(AVG(carbs_g), 0)   AS carbs,
         COALESCE(AVG(fat_g), 0)     AS fat,
         COALESCE(AVG(calories), 0)  AS calories
       FROM nutrition_logs
       WHERE user_id = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );

    // User targets from users table
    const user = await dbGet(
      `SELECT calorie_goal, protein_goal, carb_goal, fat_goal
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      actuals: {
        protein: Math.round(avgRow?.protein ?? 0),
        carbs: Math.round(avgRow?.carbs ?? 0),
        fat: Math.round(avgRow?.fat ?? 0),
        calories: Math.round(avgRow?.calories ?? 0),
      },
      targets: {
        protein: user?.protein_goal ?? 150,
        carbs: user?.carb_goal ?? 250,
        fat: user?.fat_goal ?? 65,
        calories: user?.calorie_goal ?? 2200,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/progress/activity   – log a day's activity
// POST /api/progress/nutrition  – log a day's nutrition
// POST /api/progress/workouts   – log a single workout session
// ─────────────────────────────────────────────────────────────────────────────
router.post("/activity", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { date, activity_minutes, calories_burned, water_litres } = req.body;
  try {
    await pool.execute(
      `INSERT INTO user_progress (user_id, date, activity_minutes, calories_burned, water_litres)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         activity_minutes = VALUES(activity_minutes),
         calories_burned  = VALUES(calories_burned),
         water_litres     = VALUES(water_litres)`,
      [userId, date, activity_minutes ?? 0, calories_burned ?? 0, water_litres ?? 0]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/nutrition", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { date, protein_g, carbs_g, fat_g, calories } = req.body;
  try {
    await pool.execute(
      `INSERT INTO nutrition_logs (user_id, date, protein_g, carbs_g, fat_g, calories)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         protein_g = VALUES(protein_g),
         carbs_g   = VALUES(carbs_g),
         fat_g     = VALUES(fat_g),
         calories  = VALUES(calories)`,
      [userId, date, protein_g ?? 0, carbs_g ?? 0, fat_g ?? 0, calories ?? 0]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/workouts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { workout_name, date, duration_minutes, difficulty } = req.body;
  try {
    await pool.execute(
      `INSERT INTO workout_logs (user_id, workout_name, date, duration_minutes, difficulty)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, workout_name ?? "Workout", date, duration_minutes ?? 0, difficulty ?? "Medium"]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
