import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { EventEmitter } from "events";
import profileRouter from "./routes/profile.routes.js";
import workoutRouter from "./routes/workout.routes.js";
import nutritionRouter from "./routes/nutrition.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import supabase from "./db.js";
import { getProfile, upsertProfile, isProfileComplete } from "./services/profile.service.js";
import { buildSystemContext } from "./services/chatContext.service.js";
import { extractProfileUpdate } from "./services/updateExtractor.service.js";
import { decideSplit, buildWorkoutPrompt, callWorkoutAI, formatWorkoutForChat, } from "./services/workoutAI.service.js";
import { getPlanByDate, getLatestPlan, savePlan, getLastLog, getRecentFocuses, } from "./services/workout.service.js";
import { buildDashboardSummary, buildChatInsight, } from "./services/dashboard.service.js";
import { callAIWithRouting } from "./services/ai.service.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

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
        const { error } = await supabase.from("users").select("id").limit(1);
        if (error) throw error;
        console.log("[DB] Supabase connected successfully.");
    }
    catch (err) {
        console.warn("[DB] Supabase connection test failed:", err.message);
    }
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;
    app.set("trust proxy", 1);
    app.use(express.json());
    app.use(session({
        secret: process.env.NEXTAUTH_SECRET || "sweat-fix-secret",
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
            if (id === 999) {
                return done(null, {
                    id: 999,
                    email: "demo@sweatfix.com",
                    name: "Demo User (Mock)",
                    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
                    profile_context: "",
                    water_goal: 2000,
                    calorie_goal: 2500,
                    protein_goal: 180,
                    carb_goal: 250,
                    fat_goal: 70
                });
            }
            const { data: user } = await supabase.from("users").select("*").eq("id", id).single();
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Google OAuth strategy
    // ───────────────────────────────────────────────────────────────────────────
    const callbackURL = process.env.NODE_ENV === "production"
        ? `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/google/callback`
        : "http://localhost:3000/auth/google/callback";
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        callbackURL,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const now = new Date().toISOString().slice(0, 19).replace("T", " ");
            const { data: user } = await supabase.from("users").select("*").eq("google_id", profile.id).maybeSingle();
            if (!user) {
                const { data: newUser, error } = await supabase.from("users").insert({
                    google_id: profile.id,
                    name: profile.displayName,
                    email: profile.emails?.[0]?.value ?? null,
                    avatar: profile.photos?.[0]?.value ?? null,
                    created_at: now,
                    last_login: now,
                }).select("*").single();
                if (error) throw error;
                return done(null, newUser);
            }
            else {
                await supabase.from("users").update({ last_login: now }).eq("id", user.id);
                const { data: refreshed } = await supabase.from("users").select("*").eq("id", user.id).single();
                return done(null, refreshed);
            }
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
            let user;
            try {
                const { data: existing } = await supabase.from("users").select("*").eq("email", "demo@sweatfix.com").maybeSingle();
                if (!existing) {
                    const { data: created, error } = await supabase.from("users").insert({
                        email: "demo@sweatfix.com",
                        name: "Demo User",
                        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
                        profile_context: "",
                        water_goal: 2000,
                    }).select("*").single();
                    if (error) throw new Error("DB insertion failed, fallback to mock");
                    user = created;
                }
                else {
                    user = existing;
                    // Refresh demo user state
                    await supabase.from("progress").delete().eq("user_id", user.id);
                    await supabase.from("daily_plans").delete().eq("user_id", user.id);
                    await supabase.from("fitness_profiles").delete().eq("user_id", user.id);
                    await supabase.from("users").update({ profile_context: "", name: "Demo User" }).eq("id", user.id);
                }
            }
            catch (dbErr) {
                console.warn("[DB] Demo login fallback to MOCK user due to DB error:", dbErr.message);
                user = {
                    id: 999,
                    email: "demo@sweatfix.com",
                    name: "Demo User (Mock)",
                    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
                    profile_context: "",
                    water_goal: 2000,
                    calorie_goal: 2500,
                    protein_goal: 180,
                    carb_goal: 250,
                    fat_goal: 70
                };
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
        const renderResponse = () => {
            if (state && user) {
                try {
                    supabase.from("users").update({ chat_id: state }).eq("id", user.id)
                        .then(({ error }) => { if (error) console.error("Failed to link chat_id:", error); });
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
        };
        if (req.session) {
            req.session.save((err) => {
                if (err) console.error("Session save error:", err);
                renderResponse();
            });
        }
        else {
            renderResponse();
        }
    });
    app.get("/api/me", (req, res) => {
        const user = req.user;
        console.log("Checking /api/me, user found:", !!user);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(user || null);
    });
    // Long-polling endpoint for Telegram bot auth flow
    app.get("/api/auth/status/:chat_id", (req, res) => {
        const chatId = req.params.chat_id;
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
            const updates = {};
            if (name && typeof name === "string") updates.name = name.trim();
            if (water_goal !== undefined) updates.water_goal = Number(water_goal);
            if (Object.keys(updates).length > 0) {
                await supabase.from("users").update(updates).eq("id", user.id);
            }
            const { data: updatedUser } = await supabase.from("users").select("*").eq("id", user.id).single();
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
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        try {
            const { data, error } = await supabase.from("progress").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7);
            if (error) throw error;
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.json(data || []);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.post("/api/progress", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;
        const { date, workout_name, calories, protein, water, carbs, fats } = req.body;
        try {
            const { error } = await supabase.from("progress").insert({
                user_id: userId, date, workout_name, calories, protein, water, carbs: carbs ?? 0, fats: fats ?? 0,
            });
            if (error) throw error;
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
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        try {
            const { data, error } = await supabase.from("daily_plans").select("*").eq("user_id", req.user.id).order("date", { ascending: false }).limit(14);
            if (error) throw error;
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.json(data || []);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.post("/api/plans", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const { date, workout_plan, diet_plan } = req.body;
        try {
            const { error } = await supabase.from("daily_plans").upsert({
                user_id: req.user.id, date, workout_plan, diet_plan, completed: 0,
            }, { onConflict: "user_id,date" });
            if (error) throw error;
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.put("/api/plans/:id/complete", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const { completed } = req.body;
        try {
            const { error } = await supabase.from("daily_plans").update({ completed: completed ? 1 : 0 }).eq("id", req.params.id).eq("user_id", req.user.id);
            if (error) throw error;
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Modular route mounts
    // ───────────────────────────────────────────────────────────────────────────
    app.use("/api/profile", profileRouter);
    app.use("/api/workout", workoutRouter);
    app.use("/api/nutrition", nutritionRouter);
    app.use("/api", dashboardRouter);
    // ───────────────────────────────────────────────────────────────────────────
    // Chat route
    // ───────────────────────────────────────────────────────────────────────────
    const PROGRESS_TRIGGER_RE = /(show|see|check|view|get|what(?:'s| is)|how(?:'s| is| am i))\s*.*(progress|improvement|streak|stats|dashboard|improving|doing|gains?)/i;
    const WORKOUT_TRIGGER_RE = /(generate|create|make|give me|show me|what(?:'s| is) my).*(today.?s?\s+workout|workout\s+plan|my\s+workout|today.?s?\s+plan)/i;
    const NUTRITION_GEN_RE = /(generate|create|make|give me|show me|what(?:'s| is) my).*(meal\s+plan|diet\s+plan|today.?s?\s+meal|what\s+should\s+i\s+eat)/i;
    const NUTRITION_LOG_RE = /(track|log|record|i\s+ate|i\s+had|just\s+ate).*(calories|meal|food|lunch|dinner|breakfast|snack)/i;
    app.post("/api/chat", async (req, res) => {
        try {
            const { message, history } = req.body;
            const user = req.user;
            // ── Progress trigger ──────────────────────────────────────────────────
            if (user && message && PROGRESS_TRIGGER_RE.test(message) && !WORKOUT_TRIGGER_RE.test(message)) {
                try {
                    const data = await buildDashboardSummary(user.id);
                    const insight = buildChatInsight(data);
                    return res.json({ text: insight });
                }
                catch (dashErr) {
                    console.error("[Chat/Progress trigger] Error:", dashErr.message);
                }
            }
            // ── Workout trigger ───────────────────────────────────────────────────
            if (user && message && WORKOUT_TRIGGER_RE.test(message)) {
                try {
                    const profile = await getProfile(user.id);
                    if (!profile || !isProfileComplete(profile)) {
                        return res.json({
                            text: "⚠️ I need your complete fitness profile before I can generate a personalized workout. Please make sure your **goal**, **workout days**, **activity level**, **weight**, **height**, **age**, and **diet type** are all set — then ask me again!",
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
                            if (log) historyMap.set(ex.name, { name: ex.name, weight_used: log.weight_used, reps_done: log.reps_done, difficulty: log.difficulty });
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
                }
            }
            // ── Nutrition Generate trigger ────────────────────────────────────────
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
            // ── Nutrition Log trigger ─────────────────────────────────────────────
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
            // ── 1. Fetch structured fitness profile ───────────────────────────────
            let fitnessProfile = null;
            if (user) {
                fitnessProfile = await getProfile(user.id);
            }
            // ── 2. Regex-extract any inline field updates from this message ───────
            if (user && message) {
                const inlineUpdate = extractProfileUpdate(message);
                if (Object.keys(inlineUpdate).length > 0) {
                    await upsertProfile(user.id, inlineUpdate);
                    fitnessProfile = await getProfile(user.id);
                    console.log("[Profile] Inline update saved for user", user.id, ":", inlineUpdate);
                }
            }
            // ── 3. Build context string ───────────────────────────────────────────
            const userContextStr = user
                ? buildSystemContext(fitnessProfile, user.profile_context)
                : "";
            const systemPrompt = `Role & Identity
You are the high-energy, motivating virtual assistant for Sweat Fix Gym.
Your goal is to help members with gym information, membership details, and general fitness motivation.

Rules to follow strictly:
1. Tone: Enthusiastic, encouraging, and professional. Use short, punchy sentences.
2. Boundaries: NEVER provide medical advice, injury diagnostics, or physical therapy. If a user asks about an injury, advise them to consult a medical professional.
3. Brevity: Keep all general responses under 3 to 4 sentences. However, when asked to generate a workout or diet plan, provide a highly detailed, comprehensive response.

Interaction Structure
Onboarding & Details Gathering: Before creating any diet or workout plan, you MUST politely ask the user to provide their current details if they haven't already. Specifically, ask for:
1. Current weight & height
2. Primary fitness goal (e.g., cut, bulk, bodyweight mastery)
3. Dietary restrictions
4. Available equipment
5. Preferred meal frequency (how many times they prefer to eat per day)
DO NOT generate a plan until you have this information.

Auto-Fill Protocol & Centralized AI Extraction:
Whenever the user discusses their fitness data (workouts, diets, weight, goals, macros, etc.), YOU MUST append a JSON block at the very end of your response inside triple backticks like this:
\`\`\`json
{
  "profile_update": {
    "goal": "muscle gain",
    "weight": 75,
    "diet_type": "vegetarian"
  },
  "macro_goals": {
    "calories": 2500,
    "protein": 180,
    "carbs": 250,
    "fats": 65
  },
  "workout_plan": "Detailed per-day workout chart...",
  "diet_plan": "Fully detailed diet plan explicitly structured by their preferred meal frequency...",
  "progress_log": {
    "workout_name": "Chicken Breast & Rice",
    "calories": 450,
    "protein": 45,
    "carbs": 50,
    "fats": 5,
    "water": 0
  },
  "memory": "User has a bad left knee and only has access to dumbbells."
}
\`\`\`
This JSON will be used to automatically update their Daily Protocol dashboard in real-time. Only include the keys that are actively relevant to the current conversation. 

Rules for the JSON block:
1. "profile_update": Include if the user states a new goal, weight, or diet type. (Weight should be a number in kg).
2. "macro_goals": Include if you have calculated or the user has stated their target daily calories/macros.
3. "workout_plan" & "diet_plan": Include as detailed markdown strings if the user asked for a generated plan.
4. "progress_log": Include if the user indicates they just completed a workout, drank water, or ate a meal. Estimate the nutritional values.
5. "memory": Include a concise summary of any new, permanent fact about the user (e.g., injuries, equipment). Do not repeat existing memory.
${userContextStr}`;
            let aiContent;
            try {
                aiContent = await callAIWithRouting(message, systemPrompt, history || []);
            }
            catch (apiError) {
                console.error("=== [SERVER ERROR] Chat API Failure ===");
                console.error(`Message: ${apiError.message}`);
                return res.json({
                    text: `⚠️ **Connection Error**: I'm currently unable to reach my training servers. Please try again in a moment.`,
                });
            }
            // Extract memory / macro_goals / progress_log / plans from AI JSON block
            let updates = { userProfile: false, progress: false, plans: false };
            if (user) {
                const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[1]);
                        aiContent = aiContent.replace(/```json\n([\s\S]*?)\n```/g, "").trim();
                        if (parsed.profile_update) {
                            await upsertProfile(user.id, parsed.profile_update);
                            console.log("[Profile] AI profile_update saved for user", user.id);
                            updates.userProfile = true;
                        }
                        if (parsed.memory) {
                            const currentContext = user.profile_context ? user.profile_context + "\n" : "";
                            const newContext = currentContext + "- " + parsed.memory;
                            await supabase.from("users").update({ profile_context: newContext }).eq("id", user.id);
                            user.profile_context = newContext;
                            console.log("Saved new memory for user", user.id);
                            updates.userProfile = true;
                        }
                        if (parsed.macro_goals) {
                            const mg = parsed.macro_goals;
                            await supabase.from("users").update({
                                calorie_goal: mg.calories || 0,
                                protein_goal: mg.protein || 0,
                                carb_goal: mg.carbs || 0,
                                fat_goal: mg.fats || 0,
                            }).eq("id", user.id);
                            console.log("Saved new macro goals for user", user.id);
                            updates.userProfile = true;
                        }
                        if (parsed.progress_log) {
                            const p = parsed.progress_log;
                            const today = new Date().toISOString().split("T")[0];
                            await supabase.from("progress").insert({
                                user_id: user.id, date: today,
                                workout_name: p.workout_name || "Log",
                                calories: p.calories || 0, protein: p.protein || 0,
                                water: p.water || 0, carbs: p.carbs || 0, fats: p.fats || 0,
                            });
                            console.log("Saved new progress log for user", user.id);
                            updates.progress = true;
                        }
                        if (parsed.workout_plan || parsed.diet_plan) {
                            const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date());
                            await supabase.from("daily_plans").insert({
                                user_id: user.id, date: formattedDate,
                                workout_plan: parsed.workout_plan || "",
                                diet_plan: parsed.diet_plan || "", completed: 0,
                            });
                            console.log("Saved new plans for user", user.id);
                            updates.plans = true;
                        }
                    }
                    catch (e) {
                        console.error("Failed to parse AI JSON for memory/progress:", e);
                    }
                }
            }
            res.json({ text: aiContent, updates });
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // Vite dev middleware / production static files
    // ───────────────────────────────────────────────────────────────────────────
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        app.use(express.static(path.join(__dirname, "dist")));
        app.get("*", (_req, res) => {
            res.sendFile(path.join(__dirname, "dist", "index.html"));
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
