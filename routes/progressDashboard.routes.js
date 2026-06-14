/**
 * routes/progressDashboard.routes.ts
 * Progress Dashboard API endpoints via Supabase client.
 */
import { Router } from "express";
import supabase from "../db.js";
const router = Router();

function requireAuth(req, res) {
    const user = req.user;
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return user.id;
}

// GET /api/progress/stats
router.get("/stats", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];
        const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

        // Monthly workout count
        const { data: monthLogs } = await supabase.from("workout_logs").select("id").eq("user_id", userId).gte("date", monthStart);
        const workoutsDone = monthLogs?.length ?? 0;

        // Weekly calories burned
        const { data: weekProgress } = await supabase.from("user_progress").select("calories_burned").eq("user_id", userId).gte("date", weekAgoStr);
        const weeklyCalories = (weekProgress || []).reduce((s, r) => s + (r.calories_burned || 0), 0);

        // Average daily water (last 7 days)
        const { data: waterData } = await supabase.from("user_progress").select("water_litres").eq("user_id", userId).gte("date", weekAgoStr);
        const avgWater = waterData && waterData.length > 0
            ? (waterData.reduce((s, r) => s + Number(r.water_litres || 0), 0) / waterData.length).toFixed(1)
            : "0.0";

        // Streak
        const { data: recentDays } = await supabase.from("user_progress").select("date").eq("user_id", userId).gt("activity_minutes", 0).order("date", { ascending: false }).limit(60);
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < (recentDays || []).length; i++) {
            const d = new Date(recentDays[i].date);
            const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
            if (diff === i || (i === 0 && diff <= 1)) streak++;
            else break;
        }

        // Last week comparison
        const { data: lastWeekProgress } = await supabase.from("user_progress").select("calories_burned").eq("user_id", userId).gte("date", twoWeeksAgoStr).lt("date", weekAgoStr);
        const lastWeekCalories = (lastWeekProgress || []).reduce((s, r) => s + (r.calories_burned || 0), 0);

        res.json({
            streak, workoutsDone, weeklyCalories,
            avgWater: parseFloat(avgWater),
            caloriesTrend: weeklyCalories >= lastWeekCalories ? "up" : "down",
            waterTrend: parseFloat(avgWater) >= 2.0 ? "up" : "down",
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/progress/activity — 7-day bar chart data
router.get("/activity", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
        // Generate 7-day date series in JS
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toISOString().split("T")[0]);
        }

        const { data } = await supabase.from("user_progress").select("date, activity_minutes")
            .eq("user_id", userId).gte("date", days[0]).lte("date", days[days.length - 1]);

        const dataMap = new Map((data || []).map((r) => [r.date, r.activity_minutes || 0]));
        const result = days.map((date) => ({
            day: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
            minutes: dataMap.get(date) || 0,
        }));
        const total = result.reduce((s, r) => s + r.minutes, 0);

        res.json({ days: result, average: result.length > 0 ? Math.round(total / result.length) : 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/progress/workouts — paginated workout history
router.get("/workouts", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    try {
        const { data, count } = await supabase.from("workout_logs")
            .select("id, workout_name, date, duration_minutes, difficulty", { count: "exact" })
            .eq("user_id", userId).order("date", { ascending: false }).range(from, to);
        const total = count ?? 0;
        res.json({ workouts: data || [], total, page, hasMore: from + limit < total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/progress/nutrition — weekly avg macros
router.get("/nutrition", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const { data: logs } = await supabase.from("nutrition_logs").select("protein_g, carbs_g, fat_g, calories")
            .eq("user_id", userId).gte("date", weekAgoStr);

        const count = logs?.length || 1;
        const totals = (logs || []).reduce((acc, r) => ({
            protein: acc.protein + Number(r.protein_g || 0),
            carbs: acc.carbs + Number(r.carbs_g || 0),
            fat: acc.fat + Number(r.fat_g || 0),
            calories: acc.calories + Number(r.calories || 0),
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        const { data: user } = await supabase.from("users").select("calorie_goal, protein_goal, carb_goal, fat_goal").eq("id", userId).single();

        res.json({
            actuals: {
                protein: Math.round(totals.protein / count), carbs: Math.round(totals.carbs / count),
                fat: Math.round(totals.fat / count), calories: Math.round(totals.calories / count),
            },
            targets: {
                protein: user?.protein_goal ?? 150, carbs: user?.carb_goal ?? 250,
                fat: user?.fat_goal ?? 65, calories: user?.calorie_goal ?? 2200,
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/progress/activity
router.post("/activity", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { date, activity_minutes, calories_burned, water_litres } = req.body;
    try {
        await supabase.from("user_progress").upsert({
            user_id: userId, date,
            activity_minutes: activity_minutes ?? 0,
            calories_burned: calories_burned ?? 0,
            water_litres: water_litres ?? 0,
        }, { onConflict: "user_id,date" });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/progress/nutrition
router.post("/nutrition", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { date, protein_g, carbs_g, fat_g, calories } = req.body;
    try {
        await supabase.from("nutrition_logs").insert({
            user_id: userId, date,
            protein_g: protein_g ?? 0, carbs_g: carbs_g ?? 0,
            fat_g: fat_g ?? 0, calories: calories ?? 0,
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/progress/workouts
router.post("/workouts", async (req, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { workout_name, date, duration_minutes, difficulty } = req.body;
    try {
        await supabase.from("workout_logs").insert({
            user_id: userId,
            workout_name: workout_name ?? "Workout",
            date, duration_minutes: duration_minutes ?? 0,
            difficulty: difficulty ?? "Medium",
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
