/**
 * services/pushCron.service.ts
 * Scheduled push notifications via Supabase client.
 */
import supabase from "../db.js";
import { sendPushToUser } from "../routes/push.routes.js";

export async function runHourlyPushTasks() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:00:00`;
    const today = now.toISOString().split('T')[0];

    // Get users with push subscriptions
    const { data: allSubs } = await supabase.from("push_subscriptions").select("user_id");
    const subUserIds = [...new Set((allSubs || []).map((s) => s.user_id))];
    if (subUserIds.length === 0) return;

    // Daily reminder: users whose reminder_time matches this hour
    const { data: reminderSettings } = await supabase
        .from("user_notification_settings")
        .select("user_id, reminder_time")
        .eq("daily_reminder", 1)
        .in("user_id", subUserIds);

    for (const setting of reminderSettings || []) {
        // Compare hour portion of reminder_time
        const reminderHour = setting.reminder_time ? String(setting.reminder_time).substring(0, 8) : null;
        if (reminderHour === hhmm) {
            await sendPushToUser(setting.user_id, "Time to move! 💪", "Your AI coach is waiting. Log a workout and keep your streak alive.", "/");
        }
    }

    // Streak at risk: sent at 7 PM for users who haven't been active today
    if (now.getHours() === 19) {
        const { data: streakSettings } = await supabase
            .from("user_notification_settings")
            .select("user_id")
            .eq("streak_alerts", 1)
            .in("user_id", subUserIds);

        for (const setting of streakSettings || []) {
            const { data: streak } = await supabase
                .from("user_streaks")
                .select("current_streak, last_active_date")
                .eq("user_id", setting.user_id)
                .maybeSingle();

            if (streak && streak.current_streak > 0 && (!streak.last_active_date || streak.last_active_date < today)) {
                await sendPushToUser(setting.user_id, "🔥 Don't break your streak!", `You have a ${streak.current_streak}-day streak. Log something today to keep it going!`, "/");
            }
        }
    }
}

export async function runWeeklySummaryIfDue() {
    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() !== 9) return;

    const { data: allSubs } = await supabase.from("push_subscriptions").select("user_id");
    const subUserIds = [...new Set((allSubs || []).map((s) => s.user_id))];
    if (subUserIds.length === 0) return;

    const { data: summarySettings } = await supabase
        .from("user_notification_settings")
        .select("user_id")
        .eq("weekly_summary", 1)
        .in("user_id", subUserIds);

    for (const row of summarySettings || []) {
        await sendPushToUser(row.user_id, "📊 Your weekly report is ready!", "Check out how you crushed it this week.", "/progress");
    }
}

export async function notifyBadgeEarned(userId, badgeName) {
    const { data: settings } = await supabase
        .from("user_notification_settings")
        .select("badge_alerts")
        .eq("user_id", userId)
        .maybeSingle();
    if (!settings?.badge_alerts) return;
    await sendPushToUser(userId, `🏅 Badge Unlocked: ${badgeName}!`, "You just earned a new achievement. Keep it up!", "/badges");
}
