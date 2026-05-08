import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import mysql from "mysql2/promise";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { EventEmitter } from "events";
import bcrypt from "bcryptjs";
import profileRouter from "./routes/profile.routes.js";
import workoutRouter from "./routes/workout.routes.js";
import nutritionRouter from "./routes/nutrition.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import pool from "./db.js";
import { getProfile, upsertProfile, isProfileComplete } from "./services/profile.service.js";
import { buildSystemContext } from "./services/chatContext.service.js";
import { extractProfileUpdate } from "./services/updateExtractor.service.js";
import {
  decideSplit,
  buildWorkoutPrompt,
  callWorkoutAI,
  formatWorkoutForChat,
} from "./services/workoutAI.service.js";
import {
  getPlanByDate,
  getLatestPlan,
  savePlan,
  getLastLog,
  getRecentFocuses,
  saveToChatbotLog,
} from "./services/workout.service.js";
import {
  buildDashboardSummary,
  buildChatInsight,
} from "./services/dashboard.service.js";
import { callAIWithRouting } from "./services/ai.service.js";
import { 
  saveAIWorkout, 
  saveAIDiet, 
  linkActivePlans, 
  logMeal, 
  updateDailyProgress 
} from "./services/plan.service.js";
import waterRouter from "./routes/water.routes.js";
import { setHydrationGoal, addWaterIntake } from "./services/water.service.js";
import activityRouter from "./routes/activity.routes.js";
import { createActivity } from "./services/activity.service.js";
import progressRouter from "./routes/progress.routes.js";
import { getDailyStats, buildProgressInsight } from "./services/progress.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript augmentation
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string;
      name: string;
      email: string;
      avatar: string;
      profile_context?: string;
      chat_id?: string;
      water_goal?: number;
      calorie_goal?: number;
      protein_goal?: number;
      carb_goal?: number;
      fat_goal?: number;
    }
  }
}

// Helper functions for DB access using the shared pool

// Helpers – thin wrappers so the rest of the code stays readable
async function dbGet(sql: string, params: any[] = []): Promise<any> {
  try {
    const [rows] = await pool.execute(sql, params);
    return (rows as any[])[0] ?? null;
  } catch (err) {
    console.error("[DB] dbGet failed:", err);
    return null;
  }
}

async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as any[];
  } catch (err) {
    console.error("[DB] dbAll failed:", err);
    return [];
  }
}

async function dbRun(
  sql: string,
  params: any[] = []
): Promise<{ insertId: number; affectedRows: number }> {
  try {
    const [result] = await pool.execute(sql, params);
    const r = result as mysql.ResultSetHeader;
    return { insertId: r.insertId, affectedRows: r.affectedRows };
  } catch (err) {
    console.error("[DB] dbRun failed:", err);
    return { insertId: 0, affectedRows: 0 };
  }
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
  } catch (err: any) {
    console.warn("[DB] MySQL connection FAILED during startServer:", err.message);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set("trust proxy", 1);
  app.use(express.json());

  app.use(
    session({
      secret: process.env.NEXTAUTH_SECRET || "sweat-fix-secret",
      resave: true,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ───────────────────────────────────────────────────────────────────────────
  // Passport – serialize / deserialize
  // ───────────────────────────────────────────────────────────────────────────
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
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
      const user = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Google OAuth strategy
  // ───────────────────────────────────────────────────────────────────────────
  const callbackURL =
    process.env.NODE_ENV === "production"
      ? `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/google/callback`
      : "http://localhost:3000/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const now = new Date().toISOString().slice(0, 19).replace("T", " ");
          let user = await dbGet(
            "SELECT * FROM users WHERE google_id = ?",
            [profile.id]
          );

          if (!user) {
            const { insertId } = await dbRun(
              `INSERT INTO users (google_id, name, email, avatar, created_at, last_login)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                profile.id,
                profile.displayName,
                profile.emails?.[0]?.value ?? null,
                profile.photos?.[0]?.value ?? null,
                now,
                now,
              ]
            );
            user = await dbGet("SELECT * FROM users WHERE id = ?", [insertId]);
          } else {
            await dbRun("UPDATE users SET last_login = ? WHERE id = ?", [
              now,
              user.id,
            ]);
            user = await dbGet("SELECT * FROM users WHERE id = ?", [user.id]);
          }

          return done(null, user);
        } catch (err: any) {
          return done(err);
        }
      }
    )
  );

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
        user = await dbGet(
          "SELECT * FROM users WHERE email = ?",
          ["demo@sweatfix.com"]
        );

        if (!user) {
          const { insertId } = await dbRun(
            `INSERT INTO users (email, name, avatar, profile_context, water_goal)
             VALUES (?, ?, ?, ?, ?)`,
            [
              "demo@sweatfix.com",
              "Demo User",
              "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
              "",
              2000,
            ]
          );
          user = await dbGet("SELECT * FROM users WHERE id = ?", [insertId]);
          if (!user) throw new Error("DB insertion failed, fallback to mock");
          } else {
            // Refresh demo user state
            await dbRun("DELETE FROM progress WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM daily_plans WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM fitness_profiles WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM workout_plans WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM workout_sessions WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM chatbot_generated_plans WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM workout_logs WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM progress_logs WHERE user_id = ?", [user.id]);
            
            // Cleanup new tables
            await dbRun("DELETE FROM chatbot_generated_workouts WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM chatbot_generated_diets WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM user_fitness_plans WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM user_meal_tracking WHERE user_id = ?", [user.id]);
            await dbRun("DELETE FROM user_progress WHERE user_id = ?", [user.id]);
            await dbRun(
              "UPDATE users SET profile_context = '', name = 'Demo User' WHERE id = ?",
              [user.id]
            );
          }
      } catch (dbErr: any) {
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

      (req as any).login(user, (err: any) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        (req as any).session.save((err: any) => {
          if (err) return res.status(500).json({ error: "Session save failed" });
          res.json(user);
        });
      });
    } catch (err: any) {
      console.error("Demo login error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Google OAuth callback
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    async (req, res) => {
      const state = req.query.state as string;
      const user = (req as any).user;

      const renderResponse = () => {
        if (state && user) {
          try {
            dbRun("UPDATE users SET chat_id = ? WHERE id = ?", [
              state,
              user.id,
            ]).catch(e => console.error("Failed to link chat_id:", e));
            
            console.log(
              `[BOT TICK] Triggering success message for Chat ID: ${state} - User: ${user.name}`
            );
            authEvents.emit(`auth_success_${state}`, user);
          } catch (e) {
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
        } else {
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

      // Explicitly save the session before responding to avoid race conditions
      if ((req as any).session) {
        (req as any).session.save((err: any) => {
          if (err) console.error("Session save error:", err);
          renderResponse();
        });
      } else {
        renderResponse();
      }
    }
  );

  app.get("/api/me", (req, res) => {
    const user = (req as any).user;
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

  app.get("/api/logout", async (req, res) => {
    const user = (req as any).user;
    if (user && user.email === "demo@sweatfix.com") {
      try {
        await dbRun("DELETE FROM progress WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM daily_plans WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM fitness_profiles WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM workout_plans WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM workout_sessions WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM chatbot_generated_plans WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM workout_logs WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM progress_logs WHERE user_id = ?", [user.id]);

        // Cleanup new tables
        await dbRun("DELETE FROM chatbot_generated_workouts WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM chatbot_generated_diets WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM user_fitness_plans WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM user_meal_tracking WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM user_progress WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM weekly_progress WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM daily_fitness_stats WHERE user_id = ?", [user.id]);
      } catch (e) {
        console.error("Failed to clear demo data:", e);
      }
    }
    (req as any).logout(() => res.json({ success: true }));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // User update
  // ───────────────────────────────────────────────────────────────────────────
  app.put("/api/user", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Progress routes
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/progress", async (req, res) => {
    if (!(req as any).user)
      return res.status(401).json({ error: "Unauthorized" });
    const userId = (req as any).user.id;

    try {
      const data = await dbAll(
        "SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC LIMIT 7",
        [userId]
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/progress", async (req, res) => {
    if (!(req as any).user)
      return res.status(401).json({ error: "Unauthorized" });
    const userId = (req as any).user.id;
    const { date, workout_name, calories, protein, water, carbs, fats } =
      req.body;

    try {
      await dbRun(
        `INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          date,
          workout_name,
          calories,
          protein,
          water,
          carbs ?? 0,
          fats ?? 0,
        ]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Daily plans routes
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/plans", async (req, res) => {
    if (!(req as any).user)
      return res.status(401).json({ error: "Unauthorized" });
    const userId = (req as any).user.id;

    try {
      const data = await dbAll(
        "SELECT * FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT 14",
        [userId]
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/plans", async (req, res) => {
    if (!(req as any).user)
      return res.status(401).json({ error: "Unauthorized" });
    const userId = (req as any).user.id;
    const { date, workout_plan, diet_plan } = req.body;

    try {
      // MySQL equivalent of SQLite's ON CONFLICT … DO UPDATE
      await dbRun(
        `INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           workout_plan = VALUES(workout_plan),
           diet_plan    = VALUES(diet_plan)`,
        [userId, date, workout_plan, diet_plan]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/plans/:id/complete", async (req, res) => {
    if (!(req as any).user)
      return res.status(401).json({ error: "Unauthorized" });
    const userId = (req as any).user.id;
    const { completed } = req.body;

    try {
      await dbRun(
        "UPDATE daily_plans SET completed = ? WHERE id = ? AND user_id = ?",
        [completed ? 1 : 0, req.params.id, userId]
      );
      res.json({ success: true });
    } catch (e: any) {
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
  app.use("/api",          dashboardRouter);
  app.use("/api/water",    waterRouter);
  app.use("/api/activity", activityRouter);
  app.use("/api/progress", progressRouter);

  // ───────────────────────────────────────────────────────────────────────────
  // Chat route
  // ───────────────────────────────────────────────────────────────────────────
  // ── Progress chat trigger regex ────────────────────────────────────────────
  // Matches: "show my progress", "how am I improving?", "check my streak", etc.
  const PROGRESS_TRIGGER_RE =
    /(show|see|check|view|get|what(?:'s| is)|how(?:'s| is| am i))\s*.*(progress|improvement|streak|stats|dashboard|improving|doing|gains?)/i;

  // ── Workout chat trigger regex ─────────────────────────────────────────────
  // Matches: "generate today's workout", "create my workout plan", etc.
  const WORKOUT_TRIGGER_RE =
    /(generate|create|make|give me|show me|what(?:'s| is) my).*(today.?s?\s+workout|workout\s+plan|my\s+workout|today.?s?\s+plan)/i;

  // ── Nutrition chat trigger regex ───────────────────────────────────────────
  const NUTRITION_GEN_RE =
    /(generate|create|make|give me|show me|what(?:'s| is) my).*(meal\s+plan|diet\s+plan|today.?s?\s+meal|what\s+should\s+i\s+eat)/i;
  
  const NUTRITION_LOG_RE =
    /(track|log|record|i\s+ate|i\s+had|just\s+ate).*(calories|meal|food|lunch|dinner|breakfast|snack)/i;

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const user = (req as any).user;

      // ── Progress trigger: show dashboard insights ─────────────────────────
      if (user && message && PROGRESS_TRIGGER_RE.test(message) && !WORKOUT_TRIGGER_RE.test(message)) {
        try {
          const data    = await buildDashboardSummary(user.id);
          const insight = buildChatInsight(data);
          return res.json({ text: insight });
        } catch (dashErr: any) {
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
              text: "⚠️ I need your complete fitness profile before I can generate a personalized workout. Please make sure your **goal**, **workout days**, **activity level**, **weight**, **height**, **age**, and **diet type** are all set — then ask me again!",
            });
          }

          const today         = new Date().toISOString().split("T")[0];
          const existingPlan  = await getPlanByDate(user.id, today);

          if (existingPlan) {
            const exercises =
              typeof existingPlan.exercises === "string"
                ? JSON.parse(existingPlan.exercises)
                : existingPlan.exercises;
            const formatted = formatWorkoutForChat({ ...existingPlan, exercises });
            return res.json({ text: `Here's your workout for today (already generated earlier):\n\n${formatted}` });
          }

          // Build history map for progressive overload
          const recentFocuses = await getRecentFocuses(user.id, 4);
          const todayFocus    = decideSplit(profile.workout_days ?? 3, recentFocuses);
          const lastPlan      = await getLatestPlan(user.id);
          const historyMap    = new Map<string, any>();

          if (lastPlan) {
            const lastExercises: any[] =
              typeof lastPlan.exercises === "string"
                ? JSON.parse(lastPlan.exercises)
                : lastPlan.exercises;

            await Promise.all(
              lastExercises.slice(0, 8).map(async (ex: any) => {
                const log = await getLastLog(user.id, ex.name);
                if (log) historyMap.set(ex.name, { name: ex.name, weight_used: log.weight_used, reps_done: log.reps_done, difficulty: log.difficulty });
              })
            );
          }

          const prompt       = buildWorkoutPrompt(profile, todayFocus, recentFocuses, historyMap);
          const generatedPlan = await callWorkoutAI(prompt);
          await savePlan(user.id, today, generatedPlan, prompt);
          await saveToChatbotLog(user.id, generatedPlan);

          const formatted = formatWorkoutForChat(generatedPlan);
          return res.json({ text: formatted });
        } catch (workoutErr: any) {
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
          plan.meals.forEach((m: any) => {
            responseText += `**${m.type}** (${m.calories} kcal)\n- ${m.items.join("\n- ")}\n\n`;
          });
          
          return res.json({ text: responseText });
        } catch (nutriErr: any) {
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
        } catch (logErr: any) {
          console.error("[Chat/Nutrition Log] Error:", logErr.message);
        }
      }


      // ── 1. Fetch structured fitness profile ────────────────────────────────
      let fitnessProfile: any = null;
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
      const progressInsight = user ? await buildProgressInsight(user.id) : "";
      const userContextStr = user
        ? buildSystemContext(fitnessProfile, user.profile_context, progressInsight)
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

      let aiContent: string;
      try {
        aiContent = await callAIWithRouting(
          message,
          systemPrompt,
          history || []
        );
      } catch (apiError: any) {
        console.error("=== [SERVER ERROR] Chat API Failure ===");
        console.error(`Message: ${apiError.message}`);
        if (apiError.stack) console.error(`Stack: ${apiError.stack}`);
        
        return res.json({
          text: `⚠️ **Connection Error**: I'm currently unable to reach my training servers. Please try again in a moment.`,
        });
      }

      // Extract memory / macro_goals / progress_log / plans from AI JSON block
      let updates = {
        userProfile: false,
        progress: false,
        plans: false
      };

      if (user) {
        const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            
            // Remove the JSON block from the text sent to the user
            aiContent = aiContent.replace(/```json\n([\s\S]*?)\n```/g, "").trim();

            // ── profile_update: AI-driven profile save (used during onboarding) ──
            if (parsed.profile_update) {
              await upsertProfile(user.id, parsed.profile_update);
              console.log("[Profile] AI profile_update saved for user", user.id, ":", parsed.profile_update);
              updates.userProfile = true;
            }

            if (parsed.memory) {
              const currentContext = user.profile_context
                ? user.profile_context + "\n"
                : "";
              const newContext = currentContext + "- " + parsed.memory;
              await dbRun(
                "UPDATE users SET profile_context = ? WHERE id = ?",
                [newContext, user.id]
              );
              user.profile_context = newContext;
              console.log(
                "Saved new memory for user",
                user.id,
                ":",
                parsed.memory
              );
              updates.userProfile = true;
            }

            if (parsed.macro_goals) {
              const mg = parsed.macro_goals;
              await dbRun(
                "UPDATE users SET calorie_goal = ?, protein_goal = ?, carb_goal = ?, fat_goal = ? WHERE id = ?",
                [
                  mg.calories || 0,
                  mg.protein || 0,
                  mg.carbs || 0,
                  mg.fats || 0,
                  user.id,
                ]
              );
              console.log(
                "Saved new macro goals for user",
                user.id,
                ":",
                mg
              );
              updates.userProfile = true;
            }

            if (parsed.progress_log) {
              const p = parsed.progress_log;
              const today = new Date().toISOString().split("T")[0];
              
              // 1. Log to legacy progress table
              await dbRun(
                `INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  user.id,
                  today,
                  p.workout_name || "Log",
                  p.calories || 0,
                  p.protein || 0,
                  p.water || 0,
                  p.carbs || 0,
                  p.fats || 0,
                ]
              );

              // 2. Log to new user_progress and user_meal_tracking
              await updateDailyProgress(user.id, today, {
                calories_consumed: p.calories || 0,
                water_ml: p.water || 0,
                weight_kg: parsed.profile_update?.weight_kg || null
              });

              if (p.food_item || p.calories) {
                await logMeal(user.id, today, {
                  meal_type: "AI Log",
                  food_item: p.food_item || p.workout_name || "Meal",
                  calories: p.calories || 0,
                  protein: p.protein || 0,
                  carbs: p.carbs || 0,
                  fats: p.fats || 0
                });
              }

              console.log("Saved new progress log for user", user.id);
              updates.progress = true;
            }

            if (parsed.workout_plan || parsed.diet_plan) {
              const today = new Date().toISOString().split("T")[0];
              
              // 1. Save to legacy daily_plans
              const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date());
              await dbRun(
                `INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed) 
                 VALUES (?, ?, ?, ?, 0)
                 ON DUPLICATE KEY UPDATE workout_plan = VALUES(workout_plan), diet_plan = VALUES(diet_plan)`,
                [user.id, formattedDate, parsed.workout_plan || "", parsed.diet_plan || ""]
              );

              // 2. Save to new structured tables
              let workoutId, dietId;
              if (parsed.workout_plan) {
                // If it's a string, we might need to parse it if AI sent it as JSON, 
                // but the prompt says "detailed markdown strings". 
                // Let's check if the AI sent a structured workout.
                const workoutObj = typeof parsed.workout_plan === 'string' 
                  ? { title: "Today's Workout", exercises: [{ name: "Workout", description: parsed.workout_plan }] }
                  : parsed.workout_plan;
                workoutId = await saveAIWorkout(user.id, workoutObj);
              }

              if (parsed.diet_plan) {
                const dietObj = typeof parsed.diet_plan === 'string'
                  ? { title: "Today's Diet", meals: [{ type: "Full Day", items: [parsed.diet_plan] }] }
                  : parsed.diet_plan;
                dietId = await saveAIDiet(user.id, dietObj);
              }

              if (workoutId || dietId) {
                await linkActivePlans(user.id, workoutId, dietId);
                
                // AI Hydration Logic
                let hydrationGoal = 2500; // Base
                let reason = "Standard hydration target.";
                
                if (parsed.workout_plan) {
                  hydrationGoal += 1000;
                  reason = "Increased hydration for high-intensity workout.";
                }
                
                await setHydrationGoal(user.id, hydrationGoal, true, reason);
                
                // Activity Log
                await createActivity(user.id, 'chatbot', 'AI Plan Generated', 
                  `Coach generated a new ${parsed.workout_plan ? 'workout' : 'diet'} plan and set a hydration target of ${hydrationGoal/1000}L.`);
              }

              console.log("Saved new plans for user", user.id);
              updates.plans = true;
            }
          } catch (e) {
            console.error("Failed to parse AI JSON for memory/progress:", e);
          }
        }
      }

      res.json({ text: aiContent, updates });
    } catch (e: any) {
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
  } else {
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
