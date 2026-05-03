import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { EventEmitter } from "events";
import profileRouter from "./routes/profile.routes.js";
import workoutRouter from "./routes/workout.routes.js";
import nutritionRouter from "./routes/nutrition.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import progressRouter from "./routes/progressDashboard.routes.js";
import gamificationRouter from "./routes/gamification.routes.js";
import pushRouter from "./routes/push.routes.js";
import { runHourlyPushTasks, runWeeklySummaryIfDue } from "./services/pushCron.service.js";
import pool from "./db.js";
import { getProfile, upsertProfile, isProfileComplete } from "./services/profile.service.js";
import { buildSystemContext } from "./services/chatContext.service.js";
import { extractProfileUpdate } from "./services/updateExtractor.service.js";
import { decideSplit, buildWorkoutPrompt, callWorkoutAI, formatWorkoutForChat, } from "./services/workoutAI.service.js";
import { getPlanByDate, getLatestPlan, savePlan, getLastLog, getRecentFocuses, } from "./services/workout.service.js";
import { buildDashboardSummary, buildChatInsight, } from "./services/dashboard.service.js";
import { callAI } from "./services/ai.service.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();
// Helper functions for DB access using the shared pool
// Helpers – thin wrappers so the rest of the code stays readable
async function dbGet(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] ?? null;
}
async function dbAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
async function dbRun(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    const r = result;
    return { insertId: r.insertId, affectedRows: r.affectedRows };
}
// ─────────────────────────────────────────────────────────────────────────────
// Auth event emitter (for long-polling Telegram bot flow)
// ─────────────────────────────────────────────────────────────────────────────
const authEvents = new EventEmitter();
// ─────────────────────────────────────────────────────────────────────────────
// Server bootstrap
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
    // Verify DB connectivity before starting
    try {
        const conn = await pool.getConnection();
        console.log("[DB] MySQL connected successfully.");
        conn.release();
    }
    catch (err) {
        console.error("[DB] MySQL connection FAILED:", err.message);
        process.exit(1);
    }
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;
    app.set("trust proxy", 1);
    app.use(express.json());
    // Health check endpoint
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", time: new Date().toISOString(), env: process.env.NODE_ENV || "production (default)" });
    });
    app.use(session({
        secret: process.env.NEXTAUTH_SECRET || "sweat-fix-secret",
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production" || !process.env.NODE_ENV,
            sameSite: "lax",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    // ───────────────────────────────────────────────────────────────────────────
    // Passport – serialize / deserialize
    // ───────────────────────────────────────────────────────────────────────────
    passport.serializeUser((user, done) => {
        console.log("Serializing user:", user.id);
        done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Google OAuth strategy
    // ───────────────────────────────────────────────────────────────────────────
    const callbackURL = (process.env.NODE_ENV === "production" || !process.env.NODE_ENV)
        ? `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/google/callback`
        : "http://localhost:3000/auth/google/callback";
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        callbackURL,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const now = new Date().toISOString().slice(0, 19).replace("T", " ");
            let user = await dbGet("SELECT * FROM users WHERE google_id = ?", [profile.id]);
            if (!user) {
                const { insertId } = await dbRun(`INSERT INTO users (google_id, name, email, avatar, created_at, last_login)
               VALUES (?, ?, ?, ?, ?, ?)`, [
                    profile.id,
                    profile.displayName,
                    profile.emails?.[0]?.value ?? null,
                    profile.photos?.[0]?.value ?? null,
                    now,
                    now,
                ]);
                user = await dbGet("SELECT * FROM users WHERE id = ?", [insertId]);
            }
            else {
                await dbRun("UPDATE users SET last_login = ? WHERE id = ?", [
                    now,
                    user.id,
                ]);
                user = await dbGet("SELECT * FROM users WHERE id = ?", [user.id]);
            }
            return done(null, user);
        }
        catch (err) {
            return done(err);
        }
    }));
    // ───────────────────────────────────────────────────────────────────────────
    // Auth routes
    // ───────────────────────────────────────────────────────────────────────────
    app.get("/api/auth/google", (req, res, next) => {
        const state = req.query.state ? String(req.query.state) : undefined;
        passport.authenticate("google", {
            scope: ["openid", "profile", "email"],
            state,
        })(req, res, next);
    });
    // Demo login
    app.post("/api/auth/demo", async (req, res) => {
        try {
            let user = await dbGet("SELECT * FROM users WHERE email = ?", ["demo@sweatfix.com"]);
            if (!user) {
                const { insertId } = await dbRun(`INSERT INTO users (email, name, avatar, profile_context, water_goal)
           VALUES (?, ?, ?, ?, ?)`, [
                    "demo@sweatfix.com",
                    "Demo User",
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
                    "",
                    2000,
                ]);
                user = await dbGet("SELECT * FROM users WHERE id = ?", [insertId]);
            }
            else {
                // Refresh demo user state
                await dbRun("DELETE FROM progress WHERE user_id = ?", [user.id]);
                await dbRun("DELETE FROM daily_plans WHERE user_id = ?", [user.id]);
                await dbRun("DELETE FROM user_profiles WHERE user_id = ?", [user.id]);
                await dbRun("UPDATE users SET profile_context = '', name = 'Demo User' WHERE id = ?", [user.id]);
            }
            req.login(user, (err) => {
                if (err)
                    return res.status(500).json({ error: "Login failed" });
                req.session.save((err) => {
                    if (err)
                        return res.status(500).json({ error: "Session save failed" });
                    res.json(user);
                });
            });
        }
        catch (err) {
            console.error("Demo login error:", err);
            res.status(500).json({ error: err.message });
        }
    });
    // Google OAuth callback
    app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), async (req, res) => {
        const state = req.query.state;
        const user = req.user;
        if (state && user) {
            try {
                await dbRun("UPDATE users SET chat_id = ? WHERE id = ?", [
                    state,
                    user.id,
                ]);
                console.log(`[BOT TICK] Triggering success message for Chat ID: ${state} - User: ${user.name}`);
                authEvents.emit(`auth_success_${state}`, user);
            }
            catch (e) {
                console.error("Failed to link chat_id:", e);
            }
            res.send(`
          <html>
            <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #fff; margin: 0;">
              <div style="text-align: center; padding: 2.5rem; background: #18181b; border-radius: 1.5rem; border: 1px solid #27272a; max-width: 400px; width: 90%;">
                <div style="width: 64px; height: 64px; background: #10b981; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style="color: #10b981; margin: 0 0 1rem 0; font-size: 1.5rem;">Authentication Successful!</h2>
                <p style="color: #a1a1aa; margin: 0 0 1.5rem 0; line-height: 1.5;">Welcome, <strong style="color: #fff;">${user.name}</strong>. Your account is now securely linked to your chat session.</p>
                <p style="color: #52525b; font-size: 0.875rem; margin: 0;">You can safely close this window and return to the chat.</p>
              </div>
            </body>
          </html>
        `);
        }
        else {
            res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful. This window should close automatically.</p>
            </body>
          </html>
        `);
        }
    });
    app.get("/api/me", (req, res) => {
        const user = req.user;
        console.log("Checking /api/me, user found:", !!user);
        res.json(user || null);
    });
    // Long-polling endpoint for Telegram bot auth flow
    app.get("/api/auth/status/:chat_id", (req, res) => {
        const chatId = req.params.chat_id;
        const timeout = setTimeout(() => {
            authEvents.removeAllListeners(`auth_success_${chatId}`);
            res.json({ status: "pending" });
        }, 30000);
        authEvents.once(`auth_success_${chatId}`, (user) => {
            clearTimeout(timeout);
            res.json({ status: "success", user });
        });
    });
    app.get("/api/logout", (req, res) => {
        req.logout(() => res.json({ success: true }));
    });
    // ───────────────────────────────────────────────────────────────────────────
    // User update
    // ───────────────────────────────────────────────────────────────────────────
    app.put("/api/user", async (req, res) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: "Unauthorized" });
        const { name, water_goal } = req.body;
        try {
            if (name && typeof name === "string") {
                await dbRun("UPDATE users SET name = ? WHERE id = ?", [
                    name.trim(),
                    user.id,
                ]);
            }
            if (water_goal !== undefined) {
                await dbRun("UPDATE users SET water_goal = ? WHERE id = ?", [
                    Number(water_goal),
                    user.id,
                ]);
            }
            const updatedUser = await dbGet("SELECT * FROM users WHERE id = ?", [
                user.id,
            ]);
            res.json(updatedUser);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Progress routes
    // ───────────────────────────────────────────────────────────────────────────
    app.get("/api/progress", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        try {
            const data = await dbAll("SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC LIMIT 7", [userId]);
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.post("/api/progress", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        const { date, workout_name, calories, protein, water, carbs, fats } = req.body;
        try {
            await dbRun(`INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                userId,
                date,
                workout_name,
                calories,
                protein,
                water,
                carbs ?? 0,
                fats ?? 0,
            ]);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Daily plans routes
    // ───────────────────────────────────────────────────────────────────────────
    app.get("/api/plans", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        try {
            const data = await dbAll("SELECT * FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT 14", [userId]);
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.post("/api/plans", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        const { date, workout_plan, diet_plan } = req.body;
        try {
            // MySQL equivalent of SQLite's ON CONFLICT … DO UPDATE
            await dbRun(`INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           workout_plan = VALUES(workout_plan),
           diet_plan    = VALUES(diet_plan)`, [userId, date, workout_plan, diet_plan]);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.put("/api/plans/:id/complete", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        const { completed } = req.body;
        try {
            await dbRun("UPDATE daily_plans SET completed = ? WHERE id = ? AND user_id = ?", [completed ? 1 : 0, req.params.id, userId]);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Profile routes (modular)
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/profile", profileRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Workout routes (modular)
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/workout", workoutRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Nutrition routes (modular)
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/nutrition", nutritionRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Dashboard routes (modular) — GET /api/dashboard/:userId, POST /api/progress/metrics
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api", dashboardRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Progress Dashboard routes
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/progress", progressRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Gamification routes
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/gamification", gamificationRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Push Notification routes
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/push", pushRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // OpenRouter AI connector
    // ───────────────────────────────────────────────────────────────────────────
    // ───────────────────────────────────────────────────────────────────────────
    // Chat route
    // ───────────────────────────────────────────────────────────────────────────
    // ── Progress chat trigger regex ────────────────────────────────────────────
    // Matches: "show my progress", "how am I improving?", "check my streak", etc.
    const PROGRESS_TRIGGER_RE = /(show|see|check|view|get|what(?:'s| is)|how(?:'s| is| am i))\s*.*(progress|improvement|streak|stats|dashboard|improving|doing|gains?)/i;
    // ── Workout chat trigger regex ─────────────────────────────────────────────
    // Matches: "generate today's workout", "create my workout plan", etc.
    const WORKOUT_TRIGGER_RE = /(generate|create|make|give me|show me|what(?:'s| is) my).*(today.?s?\s+workout|workout\s+plan|my\s+workout|today.?s?\s+plan)/i;
    // ── Nutrition chat trigger regex ───────────────────────────────────────────
    const NUTRITION_GEN_RE = /(generate|create|make|give me|show me|what(?:'s| is) my).*(meal\s+plan|diet\s+plan|today.?s?\s+meal|what\s+should\s+i\s+eat)/i;
    const NUTRITION_LOG_RE = /(track|log|record|i\s+ate|i\s+had|just\s+ate).*(calories|meal|food|lunch|dinner|breakfast|snack)/i;
    app.post("/api/chat", async (req, res) => {
        try {
            const { message, history } = req.body;
            const user = req.user;
            // ── Progress trigger: show dashboard insights ─────────────────────────
            if (user && message && PROGRESS_TRIGGER_RE.test(message) && !WORKOUT_TRIGGER_RE.test(message)) {
                try {
                    const data = await buildDashboardSummary(user.id);
                    const insight = buildChatInsight(data);
                    return res.json({ text: insight });
                }
                catch (dashErr) {
                    console.error("[Chat/Progress trigger] Error:", dashErr.message);
                    // Fall through to normal AI chat on error
                }
            }
            // ── Workout trigger: intercept before hitting the general AI ─────────
            if (user && message && WORKOUT_TRIGGER_RE.test(message)) {
                try {
                    const profile = await getProfile(user.id);
                    if (!profile || !isProfileComplete(profile)) {
                        return res.json({
                            text: "⚠️ I need your complete fitness profile before I can generate a personalized workout. Please complete your onboarding or set your **goal**, **gender**, **age**, **weight**, **height**, **activity level**, and **focus areas** — then ask me again!",
                        });
                    }
                    const today = new Date().toISOString().split("T")[0];
                    const existingPlan = await getPlanByDate(user.id, today);
                    if (existingPlan) {
                        const exercises = typeof existingPlan.exercises === "string"
                            ? JSON.parse(existingPlan.exercises)
                            : existingPlan.exercises;
                        const formatted = formatWorkoutForChat({ ...existingPlan, exercises });
                        return res.json({ text: `Here's your workout for today (already generated earlier):\n\n${formatted}` });
                    }
                    // Build history map for progressive overload
                    const recentFocuses = await getRecentFocuses(user.id, 4);
                    const todayFocus = decideSplit(profile.workout_days ?? 3, recentFocuses);
                    const lastPlan = await getLatestPlan(user.id);
                    const historyMap = new Map();
                    if (lastPlan) {
                        const lastExercises = typeof lastPlan.exercises === "string"
                            ? JSON.parse(lastPlan.exercises)
                            : lastPlan.exercises;
                        await Promise.all(lastExercises.slice(0, 8).map(async (ex) => {
                            const log = await getLastLog(user.id, ex.name);
                            if (log)
                                historyMap.set(ex.name, { name: ex.name, weight_used: log.weight_used, reps_done: log.reps_done, difficulty: log.difficulty });
                        }));
                    }
                    const prompt = buildWorkoutPrompt(profile, todayFocus, recentFocuses, historyMap);
                    const generatedPlan = await callWorkoutAI(prompt);
                    await savePlan(user.id, today, generatedPlan, prompt);
                    const formatted = formatWorkoutForChat(generatedPlan);
                    return res.json({ text: formatted });
                }
                catch (workoutErr) {
                    console.error("[Chat/Workout trigger] Error:", workoutErr.message);
                    // Fall through to normal AI chat on error
                }
            }
            // ── Nutrition Generate trigger ─────────────────────────────────────────
            if (user && message && NUTRITION_GEN_RE.test(message)) {
                try {
                    const profile = await getProfile(user.id);
                    if (!profile || !isProfileComplete(profile)) {
                        return res.json({
                            text: "⚠️ I need your complete fitness profile before I can generate a personalized meal plan. Please set your **goal**, **weight**, **height**, **age**, and **diet type** first!",
                        });
                    }
                    const { generateMealPlan } = await import("./services/nutrition.service.js");
                    const plan = await generateMealPlan(user.id);
                    let responseText = `🍳 **Your Personalized Meal Plan** (Target: ${plan.calories_target} kcal)\n\n`;
                    plan.meals.forEach((m) => {
                        responseText += `**${m.type}** (${m.calories} kcal)\n- ${m.items.join("\n- ")}\n\n`;
                    });
                    return res.json({ text: responseText });
                }
                catch (nutriErr) {
                    console.error("[Chat/Nutrition Gen] Error:", nutriErr.message);
                }
            }
            // ── Nutrition Log trigger ──────────────────────────────────────────────
            if (user && message && NUTRITION_LOG_RE.test(message)) {
                try {
                    const { logFoodIntake } = await import("./services/nutrition.service.js");
                    const log = await logFoodIntake(user.id, message);
                    return res.json({
                        text: `✅ Logged: **${log.food_item}**\n🔥 Calories: ${log.calories} kcal\n💪 Protein: ${log.protein}g | 🍞 Carbs: ${log.carbs}g | 🥑 Fats: ${log.fats}g`
                    });
                }
                catch (logErr) {
                    console.error("[Chat/Nutrition Log] Error:", logErr.message);
                }
            }
            // ── 1. Fetch structured fitness profile ────────────────────────────────
            let fitnessProfile = null;
            if (user) {
                fitnessProfile = await getProfile(user.id);
            }
            // ── 2. Regex-extract any inline field updates from this message ────────
            if (user && message) {
                const inlineUpdate = extractProfileUpdate(message);
                if (Object.keys(inlineUpdate).length > 0) {
                    await upsertProfile(user.id, inlineUpdate);
                    fitnessProfile = await getProfile(user.id); // refresh
                    console.log("[Profile] Inline update saved for user", user.id, ":", inlineUpdate);
                }
            }
            // ── 3. Build context string (onboarding vs. partial vs. complete) ──────
            const userContextStr = user
                ? buildSystemContext(fitnessProfile, user.profile_context)
                : "";
            const systemPrompt = `${userContextStr}

You are Sweatfix AI, a professional personal fitness coach and nutritionist. You have deep expertise in:
- Strength training, hypertrophy, and fat loss programming
- Macro and calorie-based nutrition planning
- Workout form, injury prevention, and recovery
- Motivation and habit building

Rules you always follow:
1. Give specific, actionable answers — never vague advice
2. When giving a workout plan, always include: exercise name, sets, reps, rest time, and a coaching tip
3. When giving a nutrition plan, always include: meal name, ingredients, macros (protein/carbs/fat), and total calories
4. Keep responses concise and scannable — use short paragraphs or bullet points, never long walls of text
5. Always personalise based on the user's profile (goal, activity level, focus areas) that is injected into this prompt
6. If the user asks something outside fitness/nutrition, politely redirect them back to their fitness goals
7. Always be encouraging — celebrate effort, not just results

Auto-Fill Protocol:
Whenever you generate a workout or diet plan, YOU MUST append a JSON block at the very end of your response inside triple backticks:
\`\`\`json
{
  "workout_plan": "Detailed per-day workout chart",
  "diet_plan": "Detailed diet plan",
  "macro_goals": { "calories": 0, "protein": 0, "carbs": 0, "fats": 0 }
}
\`\`\`

Include "memory" for new facts or "progress_log" for completed activities in the JSON block when relevant.`;
            let aiContent;
            try {
                aiContent = await callAI(message, systemPrompt, history || []);
            }
            catch (apiError) {
                console.error("OpenRouter API Error:", apiError.message);
                return res.json({
                    text: `⚠️ **Connection Error**: I'm currently unable to reach my training servers. Please check your API key or try again in a moment. (${apiError.message})`,
                });
            }
            // Extract memory / macro_goals / progress_log from AI JSON block
            if (user) {
                const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[1]);
                        // ── profile_update: AI-driven profile save (used during onboarding) ──
                        if (parsed.profile_update) {
                            await upsertProfile(user.id, parsed.profile_update);
                            console.log("[Profile] AI profile_update saved for user", user.id, ":", parsed.profile_update);
                        }
                        if (parsed.memory) {
                            const currentContext = user.profile_context
                                ? user.profile_context + "\\n"
                                : "";
                            const newContext = currentContext + "- " + parsed.memory;
                            await dbRun("UPDATE users SET profile_context = ? WHERE id = ?", [newContext, user.id]);
                            user.profile_context = newContext;
                            console.log("Saved new memory for user", user.id, ":", parsed.memory);
                        }
                        if (parsed.macro_goals) {
                            const mg = parsed.macro_goals;
                            await dbRun("UPDATE users SET calorie_goal = ?, protein_goal = ?, carb_goal = ?, fat_goal = ? WHERE id = ?", [
                                mg.calories || 0,
                                mg.protein || 0,
                                mg.carbs || 0,
                                mg.fats || 0,
                                user.id,
                            ]);
                            console.log("Saved new macro goals for user", user.id, ":", mg);
                        }
                        if (parsed.progress_log) {
                            const p = parsed.progress_log;
                            const today = new Date().toISOString().split("T")[0];
                            await dbRun(`INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                                user.id,
                                today,
                                p.workout_name || "Log",
                                p.calories || 0,
                                p.protein || 0,
                                p.water || 0,
                                p.carbs || 0,
                                p.fats || 0,
                            ]);
                            console.log("Saved new progress log for user", user.id, ":", p);
                        }
                    }
                    catch (e) {
                        console.error("Failed to parse AI JSON for memory/progress:", e);
                    }
                }
            }
            res.json({ text: aiContent });
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Vite dev middleware / production static files
    // ───────────────────────────────────────────────────────────────────────────
    if (process.env.NODE_ENV === "development") {
        console.log("[Server] Starting in DEVELOPMENT mode (Vite middleware)...");
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        console.log("[Server] Starting in PRODUCTION mode (Serving static files)...");
        const distPath = path.join(__dirname, "dist");
        // Check if dist exists
        if (!fs.existsSync(distPath)) {
            console.warn(`[WARNING] Static folder 'dist' not found at ${distPath}. Build the project with 'npm run build' first.`);
        }
        app.use(express.static(distPath));
        app.get("*", (_req, res) => {
            if (fs.existsSync(path.join(distPath, "index.html"))) {
                res.sendFile(path.join(distPath, "index.html"));
            }
            else {
                res.status(404).send("Frontend build not found. Please run 'npm run build'.");
            }
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
        // ─────────────────────────────────────────────────────────────────────────
        // Scheduled Push Notifications (Simple intervals)
        // ─────────────────────────────────────────────────────────────────────────
        // Run hourly tasks every 60 minutes
        setInterval(() => {
            runHourlyPushTasks().catch(e => console.error("[Cron] Hourly error:", e));
        }, 60 * 60 * 1000);
        // Run weekly check every 4 hours (to ensure it hits the 9 AM Sunday window)
        setInterval(() => {
            runWeeklySummaryIfDue().catch(e => console.error("[Cron] Weekly error:", e));
        }, 4 * 60 * 60 * 1000);
        // Initial run on boot (after 10s delay to allow DB/Env stabilization)
        setTimeout(() => {
            runHourlyPushTasks().catch(e => console.error("[Cron] Init Hourly error:", e));
            runWeeklySummaryIfDue().catch(e => console.error("[Cron] Init Weekly error:", e));
        }, 10000);
    });
}
startServer();
