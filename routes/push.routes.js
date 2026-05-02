/**
 * routes/push.routes.ts
 * Web push subscription + notification send endpoints.
 */
import { Router } from "express";
import webpush from "web-push";
import pool from "../db.js";
const router = Router();
// Configure VAPID
webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:sweatfix@example.com", process.env.VAPID_PUBLIC_KEY || "", process.env.VAPID_PRIVATE_KEY || "");
function userId(req, res) {
    const u = req.user;
    if (!u) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }
    return u.id;
}
async function dbGet(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] ?? null;
}
async function dbAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/push/vapid-public-key
// Returns public VAPID key for the browser
// ─────────────────────────────────────────────────────────────────────────────
router.get("/vapid-public-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/push/subscribe
// Saves push subscription from the browser
// ─────────────────────────────────────────────────────────────────────────────
router.post("/subscribe", async (req, res) => {
    const uid = userId(req, res);
    if (!uid)
        return;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription object" });
    }
    try {
        await pool.execute(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`, [uid, endpoint, keys.p256dh, keys.auth]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/push/unsubscribe
// Removes push subscription
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/unsubscribe", async (req, res) => {
    const uid = userId(req, res);
    if (!uid)
        return;
    try {
        await pool.execute("DELETE FROM push_subscriptions WHERE user_id = ?", [uid]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/push/send
// Sends a push notification to a specific user
// ─────────────────────────────────────────────────────────────────────────────
router.post("/send", async (req, res) => {
    const { user_id, title, body, url } = req.body;
    if (!user_id)
        return res.status(400).json({ error: "user_id required" });
    try {
        const subs = await dbAll("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", [user_id]);
        if (subs.length === 0)
            return res.json({ sent: 0 });
        const payload = JSON.stringify({ title, body, url: url || "/" });
        const results = await Promise.allSettled(subs.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)));
        const sent = results.filter((r) => r.status === "fulfilled").length;
        res.json({ sent });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/push/settings
// Returns notification preferences
// ─────────────────────────────────────────────────────────────────────────────
router.get("/settings", async (req, res) => {
    const uid = userId(req, res);
    if (!uid)
        return;
    try {
        let settings = await dbGet("SELECT * FROM user_notification_settings WHERE user_id = ?", [uid]);
        if (!settings) {
            // Insert defaults
            await pool.execute("INSERT IGNORE INTO user_notification_settings (user_id) VALUES (?)", [uid]);
            settings = await dbGet("SELECT * FROM user_notification_settings WHERE user_id = ?", [uid]);
        }
        res.json(settings);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/push/settings
// Updates notification preferences
// ─────────────────────────────────────────────────────────────────────────────
router.put("/settings", async (req, res) => {
    const uid = userId(req, res);
    if (!uid)
        return;
    const { daily_reminder, reminder_time, streak_alerts, badge_alerts, weekly_summary } = req.body;
    try {
        await pool.execute(`INSERT INTO user_notification_settings
       (user_id, daily_reminder, reminder_time, streak_alerts, badge_alerts, weekly_summary)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         daily_reminder = VALUES(daily_reminder),
         reminder_time  = VALUES(reminder_time),
         streak_alerts  = VALUES(streak_alerts),
         badge_alerts   = VALUES(badge_alerts),
         weekly_summary = VALUES(weekly_summary)`, [uid, daily_reminder ?? 1, reminder_time ?? '08:00:00', streak_alerts ?? 1, badge_alerts ?? 1, weekly_summary ?? 1]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Helper export for server-side cron jobs
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPushToUser(userId, title, body, url = "/") {
    try {
        const subs = await dbAll("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", [userId]);
        if (!subs.length)
            return;
        const payload = JSON.stringify({ title, body, url });
        await Promise.allSettled(subs.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)));
    }
    catch (e) {
        console.error("[push] sendPushToUser error:", e);
    }
}
export default router;
