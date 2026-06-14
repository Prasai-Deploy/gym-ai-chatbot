/**
 * services/dashboard.service.ts
 * Progress dashboard logic via Supabase client.
 * Complex aggregations are done in JS after fetching raw data.
 */
import supabase from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Weight progress
// ─────────────────────────────────────────────────────────────────────────────
export async function getWeightProgress(userId, days = 90) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceDateStr = sinceDate.toISOString().split("T")[0];

    const { data: rows } = await supabase
        .from("progress_logs")
        .select("date, weight_kg")
        .eq("user_id", userId)
        .not("weight_kg", "is", null)
        .gte("date", sinceDateStr)
        .order("date", { ascending: true });

    if (!rows || rows.length === 0) {
        // Seed with profile weight
        const { data: profile } = await supabase
            .from("fitness_profiles")
            .select("weight_kg, updated_at")
            .eq("user_id", userId)
            .maybeSingle();
        if (profile?.weight_kg) {
            const seedDate = profile.updated_at
                ? String(profile.updated_at).split("T")[0]
                : new Date().toISOString().split("T")[0];
            return [{ date: seedDate, weight_kg: Number(profile.weight_kg) }];
        }
        return [];
    }
    return rows.map((r) => ({
        date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0],
        weight_kg: Number(r.weight_kg),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Streak computation (pure JS, fetches dates from Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function computeStreakAndStats(userId) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 365);
    const sinceDateStr = sinceDate.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    // Fetch workout plan dates
    const { data: planDates } = await supabase
        .from("workout_plans")
        .select("date")
        .eq("user_id", userId)
        .lte("date", todayStr)
        .gte("date", sinceDateStr);

    // Fetch progress dates (where workout was logged)
    const { data: progressDates } = await supabase
        .from("progress")
        .select("date")
        .eq("user_id", userId)
        .not("workout_name", "is", null)
        .neq("workout_name", "")
        .gte("date", sinceDateStr);

    // Combine into unique date set
    const dateSet = new Set([
        ...(planDates || []).map((r) => typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0]),
        ...(progressDates || []).map((r) => typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0]),
    ]);

    const totalWorkouts = dateSet.size;
    const sortedDates = Array.from(dateSet).sort((a, b) => (a > b ? -1 : 1));

    // Current streak
    let currentStreak = 0;
    if (sortedDates.length > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const streakStarted = dateSet.has(todayStr) || dateSet.has(yesterday.toISOString().split("T")[0]);
        if (streakStarted) {
            let cursor = dateSet.has(todayStr) ? new Date(today) : new Date(yesterday);
            while (dateSet.has(cursor.toISOString().split("T")[0])) {
                currentStreak++;
                cursor.setDate(cursor.getDate() - 1);
            }
        }
    }

    // Longest streak
    let longestStreak = 0, runningStreak = 0, prevDate = null;
    for (const d of sortedDates) {
        const curr = new Date(d);
        if (prevDate !== null) {
            const diff = Math.round((prevDate.getTime() - curr.getTime()) / 86400000);
            runningStreak = diff === 1 ? runningStreak + 1 : 1;
        } else {
            runningStreak = 1;
        }
        longestStreak = Math.max(longestStreak, runningStreak);
        prevDate = curr;
    }

    // Weekly workout count
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const weeklyDates = new Set([
        ...(planDates || []).filter((r) => r.date >= weekAgoStr).map((r) => r.date),
        ...(progressDates || []).filter((r) => r.date >= weekAgoStr).map((r) => r.date),
    ]);
    const weeklyWorkouts = weeklyDates.size;

    const lastWorkoutDate = sortedDates[0] ?? null;

    // Upsert stats cache
    await supabase.from("user_stats").upsert({
        user_id: userId,
        total_workouts: totalWorkouts,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_workout_date: lastWorkoutDate,
    }, { onConflict: "user_id" });

    return { total_workouts: totalWorkouts, current_streak: currentStreak, longest_streak: longestStreak, weekly_workouts: weeklyWorkouts, last_workout_date: lastWorkoutDate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strength progress
// ─────────────────────────────────────────────────────────────────────────────
export async function getStrengthProgress(userId, topN = 5) {
    const { data: logs } = await supabase
        .from("workout_logs")
        .select("exercise_name, date, weight_used")
        .eq("user_id", userId)
        .not("weight_used", "is", null)
        .gt("weight_used", 0)
        .order("date", { ascending: true });

    if (!logs || logs.length === 0) return [];

    // Count exercises and find top N
    const countMap = new Map();
    for (const log of logs) {
        countMap.set(log.exercise_name, (countMap.get(log.exercise_name) || 0) + 1);
    }
    const topExercises = Array.from(countMap.entries())
        .filter(([, cnt]) => cnt >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([name]) => name);

    if (topExercises.length === 0) return [];

    // Group history by exercise
    const topSet = new Set(topExercises);
    const grouped = new Map();
    for (const log of logs) {
        if (!topSet.has(log.exercise_name)) continue;
        if (!grouped.has(log.exercise_name)) grouped.set(log.exercise_name, []);
        grouped.get(log.exercise_name).push({
            date: typeof log.date === "string" ? log.date : new Date(log.date).toISOString().split("T")[0],
            weight_kg: Number(log.weight_used),
        });
    }

    return topExercises.filter((name) => grouped.has(name)).map((name) => ({
        exercise: name,
        history: grouped.get(name),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Most improved exercise
// ─────────────────────────────────────────────────────────────────────────────
export async function getMostImproved(userId) {
    const { data: logs } = await supabase
        .from("workout_logs")
        .select("exercise_name, weight_used")
        .eq("user_id", userId)
        .not("weight_used", "is", null)
        .gt("weight_used", 0)
        .order("date", { ascending: true });

    if (!logs || logs.length === 0) return null;

    // Group by exercise: track first and last weight
    const exercises = new Map();
    for (const log of logs) {
        if (!exercises.has(log.exercise_name)) {
            exercises.set(log.exercise_name, { first: Number(log.weight_used), latest: Number(log.weight_used), count: 0 });
        }
        const e = exercises.get(log.exercise_name);
        e.latest = Number(log.weight_used);
        e.count++;
    }

    let best = null;
    for (const [name, e] of exercises) {
        if (e.count < 2 || e.latest <= e.first) continue;
        const pct = ((e.latest - e.first) / e.first) * 100;
        if (!best || pct > best.improvement_pct) {
            best = { exercise: name, first_weight: e.first, latest_weight: e.latest, improvement_pct: Math.round(pct * 10) / 10 };
        }
    }
    return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent workouts
// ─────────────────────────────────────────────────────────────────────────────
export async function getRecentWorkouts(userId, limit = 7) {
    const { data } = await supabase
        .from("workout_plans")
        .select("date, focus")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);
    return (data || []).map((r) => ({
        date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0],
        focus: r.focus ?? "Workout",
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Master aggregator
// ─────────────────────────────────────────────────────────────────────────────
export async function buildDashboardSummary(userId) {
    const [weightProgress, stats, strengthProgress, mostImproved, recentWorkouts] = await Promise.all([
        getWeightProgress(userId),
        computeStreakAndStats(userId),
        getStrengthProgress(userId),
        getMostImproved(userId),
        getRecentWorkouts(userId),
    ]);
    return { weight_progress: weightProgress, stats, strength_progress: strengthProgress, most_improved: mostImproved, recent_workouts: recentWorkouts };
}

/** Upserts a body-metrics snapshot into progress_logs. */
export async function logMetrics(userId, payload) {
    const date = payload.date ?? new Date().toISOString().split("T")[0];
    // Read existing
    const { data: existing } = await supabase
        .from("progress_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();

    const row = {
        user_id: userId,
        date,
        weight_kg: payload.weight_kg ?? existing?.weight_kg ?? null,
        body_fat_pct: payload.body_fat_pct ?? existing?.body_fat_pct ?? null,
        chest_cm: payload.chest_cm ?? existing?.chest_cm ?? null,
        waist_cm: payload.waist_cm ?? existing?.waist_cm ?? null,
        hips_cm: payload.hips_cm ?? existing?.hips_cm ?? null,
        notes: payload.notes ?? existing?.notes ?? null,
    };

    await supabase.from("progress_logs").upsert(row, { onConflict: "user_id,date" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat insight formatter
// ─────────────────────────────────────────────────────────────────────────────
export function buildChatInsight(data) {
    const lines = [];
    if (data.stats.current_streak > 0) {
        lines.push(`🔥 You're on a **${data.stats.current_streak}-day workout streak** — don't break it!`);
    } else {
        lines.push(`💪 You've completed **${data.stats.total_workouts} workout${data.stats.total_workouts !== 1 ? "s" : ""}** in total.`);
    }
    if (data.stats.weekly_workouts > 0) {
        lines.push(`📅 This week you've trained **${data.stats.weekly_workouts} day${data.stats.weekly_workouts !== 1 ? "s" : ""}** (longest streak ever: ${data.stats.longest_streak}).`);
    }
    if (data.weight_progress.length >= 2) {
        const first = data.weight_progress[0].weight_kg;
        const latest = data.weight_progress[data.weight_progress.length - 1].weight_kg;
        const diff = Math.round((first - latest) * 10) / 10;
        if (diff > 0) lines.push(`⚖️ You've lost **${diff} kg** since you started tracking — great work!`);
        else if (diff < 0) lines.push(`⚖️ You've gained **${Math.abs(diff)} kg** — keep fuelling those gains!`);
        else lines.push(`⚖️ Your weight has stayed steady — consistency is key!`);
    }
    if (data.most_improved) {
        lines.push(`📈 Your **${data.most_improved.exercise}** improved by **${data.most_improved.improvement_pct}%** — that's real strength progress!`);
    } else if (data.strength_progress.length > 0) {
        lines.push(`💪 You've been tracking **${data.strength_progress.length} exercise${data.strength_progress.length !== 1 ? "s" : ""}** — keep logging to unlock strength insights!`);
    }
    lines.push(`\nKeep pushing — every rep counts! Want a detailed breakdown of any specific metric?`);
    return lines.join("\n");
}
