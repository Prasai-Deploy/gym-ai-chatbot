/**
 * routes/push.routes.ts
 * Web push subscription + notification endpoints via Supabase client.
 */
import { Router } from "express";
import webpush from "web-push";
import supabase from "../db.js";
const router = Router();

webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:sweatfix@example.com", process.env.VAPID_PUBLIC_KEY || "", process.env.VAPID_PRIVATE_KEY || "");

function userId(req, res) {
    const u = req.user;
    if (!u) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return u.id;
}

router.get("/vapid-public-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

router.post("/subscribe", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: "Invalid subscription" });
    try {
        await supabase.from("push_subscriptions").upsert({
            user_id: uid, endpoint, p256dh: keys.p256dh, auth: keys.auth,
        }, { onConflict: "endpoint" });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/unsubscribe", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    try {
        await supabase.from("push_subscriptions").delete().eq("user_id", uid);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/send", async (req, res) => {
    const { user_id, title, body, url } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    try {
        const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user_id);
        if (!subs || subs.length === 0) return res.json({ sent: 0 });
        const payload = JSON.stringify({ title, body, url: url || "/" });
        const results = await Promise.allSettled(subs.map((sub) =>
            webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        ));
        res.json({ sent: results.filter((r) => r.status === "fulfilled").length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/settings", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    try {
        let { data: settings } = await supabase.from("user_notification_settings").select("*").eq("user_id", uid).maybeSingle();
        if (!settings) {
            await supabase.from("user_notification_settings").upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true });
            const { data } = await supabase.from("user_notification_settings").select("*").eq("user_id", uid).single();
            settings = data;
        }
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/settings", async (req, res) => {
    const uid = userId(req, res);
    if (!uid) return;
    const { daily_reminder, reminder_time, streak_alerts, badge_alerts, weekly_summary } = req.body;
    try {
        await supabase.from("user_notification_settings").upsert({
            user_id: uid,
            daily_reminder: daily_reminder ?? 1,
            reminder_time: reminder_time ?? "08:00:00",
            streak_alerts: streak_alerts ?? 1,
            badge_alerts: badge_alerts ?? 1,
            weekly_summary: weekly_summary ?? 1,
        }, { onConflict: "user_id" });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Helper for server-side push
export async function sendPushToUser(userId, title, body, url = "/") {
    try {
        const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
        if (!subs?.length) return;
        const payload = JSON.stringify({ title, body, url });
        await Promise.allSettled(subs.map((sub) =>
            webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        ));
    } catch (e) { console.error("[push] sendPushToUser error:", e); }
}

export default router;
