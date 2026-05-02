/**
 * services/pushCron.service.ts
 * Scheduled push notifications: daily reminder, streak risk, weekly summary.
 * Integrated in server.ts after DB is ready.
 */
import pool from "../db.js";
import { sendPushToUser } from "../routes/push.routes.js";
async function dbAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
// ─── Daily reminder + streak-at-risk ───────────────────────────────────────
// Called every hour; checks which users need a notification
export async function runHourlyPushTasks() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const today = now.toISOString().split('T')[0];
    // Daily reminder: users whose reminder_time matches this hour (within :00-:59)
    const reminderUsers = await dbAll(`SELECT ns.user_id
     FROM user_notification_settings ns
     JOIN push_subscriptions ps ON ps.user_id = ns.user_id
     WHERE ns.daily_reminder = 1
       AND DATE_FORMAT(ns.reminder_time, '%H:00:00') = DATE_FORMAT(?, '%H:00:00')
     GROUP BY ns.user_id`, [hhmm]);
    for (const row of reminderUsers) {
        await sendPushToUser(row.user_id, "Time to move! 💪", "Your AI coach is waiting. Log a workout and keep your streak alive.", "/");
    }
    // Streak at risk: sent at 19:xx (7 PM) for users who haven't been active today
    if (now.getHours() === 19) {
        const atRiskUsers = await dbAll(`SELECT ns.user_id, us.current_streak
       FROM user_notification_settings ns
       JOIN push_subscriptions ps ON ps.user_id = ns.user_id
       JOIN user_streaks us ON us.user_id = ns.user_id
       WHERE ns.streak_alerts = 1
         AND us.current_streak > 0
         AND (us.last_active_date IS NULL OR us.last_active_date < ?)`, [today]);
        for (const row of atRiskUsers) {
            await sendPushToUser(row.user_id, "🔥 Don't break your streak!", `You have a ${row.current_streak}-day streak. Log something today to keep it going!`, "/");
        }
    }
}
// ─── Weekly summary: every Sunday at 9 AM ──────────────────────────────────
export async function runWeeklySummaryIfDue() {
    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() !== 9)
        return; // Sunday 9 AM only
    const subs = await dbAll(`SELECT ns.user_id FROM user_notification_settings ns
     JOIN push_subscriptions ps ON ps.user_id = ns.user_id
     WHERE ns.weekly_summary = 1`, []);
    for (const row of subs) {
        await sendPushToUser(row.user_id, "📊 Your weekly report is ready!", "Check out how you crushed it this week — view your progress now.", "/progress" // deeplinks to the progress dashboard tab
        );
    }
}
// ─── Badge earned notification ──────────────────────────────────────────────
export async function notifyBadgeEarned(userId, badgeName) {
    const [settingsRow] = await pool.execute("SELECT badge_alerts FROM user_notification_settings WHERE user_id = ?", [userId]);
    const settings = settingsRow[0];
    if (!settings?.badge_alerts)
        return;
    await sendPushToUser(userId, `🏅 Badge Unlocked: ${badgeName}!`, "You just earned a new achievement. Keep it up!", "/badges");
}
