/**
 * services/gamification.service.ts
 * Streak tracking + badge awarding via Supabase client.
 */
import supabase from "../db.js";

export const BADGE_CATALOGUE = [
    { key: "first_chat", name: "First Steps", icon: "💬", description: "Sent your first message to the AI coach" },
    { key: "first_workout", name: "Gym Rookie", icon: "🏋️", description: "Logged your very first workout" },
    { key: "streak_3", name: "Hat-Trick", icon: "🔥", description: "Maintained a 3-day activity streak" },
    { key: "streak_7", name: "Week Warrior", icon: "⚡", description: "Maintained a 7-day activity streak" },
    { key: "streak_30", name: "Iron Will", icon: "💎", description: "Maintained a 30-day activity streak" },
    { key: "workout_10", name: "Consistent", icon: "💪", description: "Logged 10 total workouts" },
    { key: "workout_50", name: "Grinder", icon: "🏆", description: "Logged 50 total workouts" },
    { key: "nutrition_week", name: "Fuel Master", icon: "🥗", description: "Logged nutrition for 7 consecutive days" },
    { key: "goal_setter", name: "Goal Setter", icon: "🎯", description: "Completed the onboarding flow" },
    { key: "early_bird", name: "Early Bird", icon: "🌅", description: "Logged a workout before 8 AM" },
];

export async function touchStreak(userId) {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: row } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (!row) {
        await supabase.from("user_streaks").insert({
            user_id: userId, current_streak: 1, longest_streak: 1, last_active_date: todayStr,
        });
        return { current_streak: 1, longest_streak: 1, milestone: 1 };
    }

    const lastDate = row.last_active_date
        ? (typeof row.last_active_date === "string" ? row.last_active_date : new Date(row.last_active_date).toISOString().split("T")[0])
        : null;

    if (lastDate === todayStr) {
        return { current_streak: row.current_streak, longest_streak: row.longest_streak, milestone: null };
    }

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const newStreak = lastDate === yesterdayStr ? row.current_streak + 1 : 1;
    const newLongest = Math.max(newStreak, row.longest_streak ?? 0);

    await supabase.from("user_streaks").update({
        current_streak: newStreak, longest_streak: newLongest, last_active_date: todayStr,
    }).eq("user_id", userId);

    let milestone = null;
    const prev = row.current_streak;
    if (newStreak === 3 && prev < 3) milestone = 3;
    else if (newStreak === 7 && prev < 7) milestone = 7;
    else if (newStreak === 30 && prev < 30) milestone = 30;

    return { current_streak: newStreak, longest_streak: newLongest, milestone };
}

export async function getStreak(userId) {
    const { data } = await supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle();
    return { current_streak: data?.current_streak ?? 0, longest_streak: data?.longest_streak ?? 0 };
}

export async function awardBadge(userId, badgeKey) {
    // Upsert — if conflict on (user_id, badge_key), it's already earned
    const { error } = await supabase.from("user_badges").upsert(
        { user_id: userId, badge_key: badgeKey },
        { onConflict: "user_id,badge_key", ignoreDuplicates: true }
    );
    if (error) return false;
    // Check if it was just earned (within last 3 seconds)
    const threeSecsAgo = new Date(Date.now() - 3000).toISOString();
    const { data } = await supabase.from("user_badges").select("id")
        .eq("user_id", userId).eq("badge_key", badgeKey).gte("earned_at", threeSecsAgo).maybeSingle();
    return !!data;
}

export async function getUserBadges(userId) {
    const { data } = await supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", userId).order("earned_at", { ascending: true });
    return (data || []).map((b) => ({
        badge_key: b.badge_key,
        earned_at: b.earned_at ? new Date(b.earned_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : null,
    }));
}

export async function checkAndAwardBadges(userId, triggers) {
    const newlyAwarded = [];
    const tryAward = async (key) => {
        const awarded = await awardBadge(userId, key);
        if (awarded) newlyAwarded.push(key);
    };
    if (triggers.firstChat) await tryAward("first_chat");
    if (triggers.firstWorkout) await tryAward("first_workout");
    if (triggers.goalSetter) await tryAward("goal_setter");
    if (triggers.earlyBird) await tryAward("early_bird");
    if (triggers.streak) {
        if (triggers.streak >= 3) await tryAward("streak_3");
        if (triggers.streak >= 7) await tryAward("streak_7");
        if (triggers.streak >= 30) await tryAward("streak_30");
    }
    if (triggers.workoutCount) {
        if (triggers.workoutCount >= 10) await tryAward("workout_10");
        if (triggers.workoutCount >= 50) await tryAward("workout_50");
    }
    if (triggers.nutritionConsecutiveDays && triggers.nutritionConsecutiveDays >= 7) {
        await tryAward("nutrition_week");
    }
    return newlyAwarded;
}

export async function getStreakLeaderboard() {
    const { data } = await supabase
        .from("user_streaks")
        .select("user_id, current_streak")
        .order("current_streak", { ascending: false })
        .limit(5);

    if (!data || data.length === 0) return [];

    // Fetch user details for the leaderboard
    const userIds = data.map((r) => r.user_id);
    const { data: users } = await supabase.from("users").select("id, name, avatar").in("id", userIds);
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    return data.map((r, i) => ({
        rank: i + 1,
        user_id: r.user_id,
        name: userMap.get(r.user_id)?.name ?? "Unknown",
        avatar: userMap.get(r.user_id)?.avatar ?? null,
        current_streak: r.current_streak,
    }));
}
