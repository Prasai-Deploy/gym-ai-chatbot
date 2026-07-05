import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cron from "node-cron";

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
import supabase from "./db.js";
import { createClient } from "@supabase/supabase-js";
// Admin client uses service_role key — can verify user JWTs
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "",
  { auth: { persistSession: false } }
);
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
import adminRouter from "./routes/admin.routes.js";
import { getDailyStats, buildProgressInsight } from "./services/progress.service.js";
import { parseAndApplyAIData } from "./services/aiDataParser.service.js";

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



// ─────────────────────────────────────────────────────────────────────────────
// Auth event emitter (for long-polling Telegram bot flow)
// ─────────────────────────────────────────────────────────────────────────────
const authEvents = new EventEmitter();

// ─────────────────────────────────────────────────────────────────────────────
// SSE — per-user stream clients map (userId → Set of response objects)
// ─────────────────────────────────────────────────────────────────────────────
const sseClients = new Map<number, Set<any>>();

function broadcastToUser(userId: number, event: string, data: any) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server bootstrap
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  // Verified DB connectivity implicitly via Supabase client

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set("trust proxy", 1);
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "sweat-fix-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Fixes missing cookies behind proxies
        sameSite: "lax", // API and frontend share the same origin
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ───────────────────────────────────────────────────────────────────────────
  // Supabase Bearer Token Middleware
  // ───────────────────────────────────────────────────────────────────────────
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
        if (sbUser && sbUser.email) {
          const { data: allowed } = await supabaseAdmin.from('allowed_users').select('*').eq('email', sbUser.email).maybeSingle();
          if (!allowed) {
            return res.status(403).json({ message: "Access denied by administrator" });
          }
          let { data: dbUser } = await supabaseAdmin.from('users').select('*').eq('email', sbUser.email).maybeSingle();
          if (!dbUser) {
            const now = new Date().toISOString();
            const { data: newUser } = await supabase.from('users').insert({
              email: sbUser.email,
              name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email.split('@')[0],
              avatar: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
              created_at: now,
              last_login: now,
            }).select().maybeSingle();
            dbUser = newUser;
          } else {
            const now = new Date().toISOString();
            await supabase.from('users').update({ last_login: now }).eq('id', dbUser.id);
          }
          if (dbUser) {
            (req as any).user = dbUser;
          }
        }
      } catch (err) {
        console.error("Supabase JWT validation failed:", err);
      }
    }
    next();
  });

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
        } as any);
      }
      const { data: user } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
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
      ? (process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, "")}/auth/google/callback`
        : "https://stirva.space/auth/google/callback")
      : "http://localhost:5000/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          if (email) {
            const { data: allowed } = await supabaseAdmin.from('allowed_users').select('*').eq('email', email).maybeSingle();
            if (!allowed) {
              return done(null, false, { message: "Access denied by administrator" });
            }
          } else {
            return done(null, false, { message: "Access denied by administrator" });
          }

          const now = new Date().toISOString().slice(0, 19).replace("T", " ");
          let { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.id)
            .maybeSingle();

          if (!user && email) {
            // Check if user was manually added by admin via email
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .maybeSingle();

            if (existingUser) {
              // Link google_id
              const { data: linkedUser, error } = await supabase.from('users').update({
                google_id: profile.id,
                last_login: now,
                avatar: profile.photos?.[0]?.value ?? existingUser.avatar
              }).eq('id', existingUser.id).select().maybeSingle();
              if (error) console.error("Update linked user error", error);
              user = linkedUser;
            }
          }

          if (!user) {
            const { data: newUser, error } = await supabase.from('users').insert({
              google_id: profile.id,
              name: profile.displayName,
              email: email,
              avatar: profile.photos?.[0]?.value ?? null,
              created_at: now,
              last_login: now,
            }).select().maybeSingle();

            if (error) console.error("Insert error", error);
            user = newUser;
          } else if (user && user.google_id === profile.id) {
            const { data: updatedUser, error } = await supabase.from('users').update({
              last_login: now,
            }).eq('id', user.id).select().maybeSingle();

            if (error) console.error("Update error", error);
            user = updatedUser;
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

  app.get("/auth/google", (req, res, next) => {
    const state = req.query.state ? String(req.query.state) : undefined;
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      state,
    })(req, res, next);
  });

  // Demo login
  app.post("/api/auth/demo", async (req, res) => {
    try {
      const { data: allowed } = await supabaseAdmin.from('allowed_users').select('*').eq('email', 'demo@sweatfix.com').maybeSingle();
      if (!allowed) {
        return res.status(403).json({ message: "Access denied by administrator" });
      }

      let user;
      try {
        const { data: existingUser } = await supabaseAdmin.from('users').select('*').eq('email', 'demo@sweatfix.com').maybeSingle();
        user = existingUser;

        if (!user) {
          const { data: newUser, error } = await supabaseAdmin.from('users').insert({
            email: "demo@sweatfix.com",
            name: "Demo User",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
            profile_context: "",
            water_goal: 2000,
          }).select().maybeSingle();
          if (error || !newUser) throw new Error("DB insertion failed, fallback to mock");
          user = newUser;
        } else {
          // Refresh demo user state
          await supabaseAdmin.from('users').update({ is_admin: false }).eq('id', user.id);
          await supabase.from('progress').delete().eq('user_id', user.id);
          await supabase.from('daily_plans').delete().eq('user_id', user.id);
          await supabase.from('fitness_profiles').delete().eq('user_id', user.id);
          await supabase.from('workout_plans').delete().eq('user_id', user.id);
          await supabase.from('workout_sessions').delete().eq('user_id', user.id);
          await supabase.from('chatbot_generated_plans').delete().eq('user_id', user.id);
          await supabase.from('workout_logs').delete().eq('user_id', user.id);
          await supabase.from('progress_logs').delete().eq('user_id', user.id);

          // Cleanup new tables
          await supabase.from('chatbot_generated_workouts').delete().eq('user_id', user.id);
          await supabase.from('chatbot_generated_diets').delete().eq('user_id', user.id);
          await supabase.from('user_fitness_plans').delete().eq('user_id', user.id);
          await supabase.from('user_meal_tracking').delete().eq('user_id', user.id);
          await supabase.from('user_progress').delete().eq('user_id', user.id);
          await supabase.from('users').update({ profile_context: '', name: 'Demo User' }).eq('id', user.id);
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


  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err || !user) {
          const baseRedirect = process.env.NODE_ENV === "production"
            ? (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "https://sweat.prasai.cloud")
            : (process.env.FRONTEND_URL || "http://localhost:5173");
          return res.redirect(`${baseRedirect}/membership-required`);
        }
        (req as any).logIn(user, (loginErr: any) => {
          if (loginErr) return res.status(500).json({ error: "Login failed" });
          next();
        });
      })(req, res, next);
    },
    async (req, res) => {
      const state = req.query.state as string;
      const user = (req as any).user;

      const renderResponse = async () => {
        if (state && user) {
          try {
            supabase.from('users').update({ chat_id: state }).eq('id', user.id)
              .then(({ error }) => { if (error) console.error("Failed to link chat_id:", error); });
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
                  <p style="color: #a1a1aa; margin: 0 0 1.5rem 0; line-height: 1.5;">Welcome, <strong style="color: #fff;">${user.name}</strong>.</p>
                  <p style="color: #52525b; font-size: 0.875rem; margin: 0;">You can safely close this window and return to the chat.</p>
                </div>
              </body>
            </html>
          `);
        } else if (user) {
          let isAdmin = false;
          try {
            const { data: adminRecord } = await supabaseAdmin.from('admins').select('*').eq('email', user.email).maybeSingle();
            if (adminRecord) {
              isAdmin = true;
            }
          } catch (e) {
            console.error("Admin check failed", e);
          }
          const baseRedirect = process.env.NODE_ENV === "production"
            ? (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "https://sweat.prasai.cloud")
            : (process.env.FRONTEND_URL || "http://localhost:5173");
          const redirectUrl = isAdmin ? `${baseRedirect}/admin` : `${baseRedirect}/dashboard`;
          res.redirect(redirectUrl);
        } else {
          res.redirect("/login");
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

  const authMeHandler = async (req: any, res: any) => {
    const user = req.user;
    if (user && user.email) {
      try {
        const { data: adminRecord } = await supabaseAdmin.from('admins').select('*').eq('email', user.email).maybeSingle();
        if (adminRecord) {
          user.is_admin = true;
          user.role = adminRecord.role;
        } else {
          user.is_admin = false;
        }
      } catch (err) {
        console.error("Error checking admin status in /auth/me:", err);
      }
    }
    console.log("[/auth/me] user found:", user ? `id=${user.id} email=${user.email}` : 'none');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(user || null);
  };
  app.get("/auth/me", authMeHandler);
  app.get("/api/auth/me", authMeHandler);

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

  app.get("/auth/logout", async (req, res) => {
    const user = (req as any).user;
    if (user && user.email === "demo@sweatfix.com") {
      try {
        await supabase.from('progress').delete().eq('user_id', user.id);
        await supabase.from('daily_plans').delete().eq('user_id', user.id);
        await supabase.from('fitness_profiles').delete().eq('user_id', user.id);
        await supabase.from('workout_plans').delete().eq('user_id', user.id);
        await supabase.from('workout_sessions').delete().eq('user_id', user.id);
        await supabase.from('chatbot_generated_plans').delete().eq('user_id', user.id);
        await supabase.from('workout_logs').delete().eq('user_id', user.id);
        await supabase.from('progress_logs').delete().eq('user_id', user.id);

        // Cleanup new tables
        await supabase.from('chatbot_generated_workouts').delete().eq('user_id', user.id);
        await supabase.from('chatbot_generated_diets').delete().eq('user_id', user.id);
        await supabase.from('user_fitness_plans').delete().eq('user_id', user.id);
        await supabase.from('user_meal_tracking').delete().eq('user_id', user.id);
        await supabase.from('user_progress').delete().eq('user_id', user.id);
        await supabase.from('weekly_progress').delete().eq('user_id', user.id);
        await supabase.from('daily_fitness_stats').delete().eq('user_id', user.id);
      } catch (e) {
        console.error("Failed to clear demo data:", e);
      }
    }
    (req as any).logout(() => {
      if ((req as any).session) {
        (req as any).session.destroy((err: any) => {
          res.redirect("/");
        });
      } else {
        res.redirect("/");
      }
    });
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
        await supabase.from('users').update({ name: name.trim() }).eq('id', user.id);
      }
      if (water_goal !== undefined) {
        await supabase.from('users').update({ water_goal: Number(water_goal) }).eq('id', user.id);
      }
      const { data: updatedUser, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (error) throw error;
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
      const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7);
      if (error) throw error;
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data || []);
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
      const { error } = await supabase.from('progress').insert({
        user_id: userId,
        date,
        workout_name,
        calories,
        protein,
        water,
        carbs: carbs ?? 0,
        fats: fats ?? 0,
      });
      if (error) throw error;
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
      const { data, error } = await supabase.from('daily_plans').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(14);
      if (error) throw error;
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data || []);
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
      const { data: existing } = await supabase.from('daily_plans').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('daily_plans').update({
          workout_plan,
          diet_plan
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_plans').insert({
          user_id: userId,
          date,
          workout_plan,
          diet_plan,
          completed: 0
        });
        if (error) throw error;
      }
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
      const { error } = await supabase.from('daily_plans').update({
        completed: completed ? 1 : 0
      }).eq('id', req.params.id).eq('user_id', userId);
      if (error) throw error;
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
  app.use("/api", dashboardRouter);
  app.use("/api/water", waterRouter);
  app.use("/api/activity", activityRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/admin", adminRouter);

  // ───────────────────────────────────────────────────────────────────────────
  // SSE — Real-time push to dashboard
  // GET /api/stream
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/stream", (req, res) => {
    const user = (req as any).user;
    if (!user) { res.status(401).end(); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Nginx / Hostinger pass-through
    res.flushHeaders();

    // Register this client
    if (!sseClients.has(user.id)) sseClients.set(user.id, new Set());
    sseClients.get(user.id)!.add(res);
    console.log(`[SSE] Client connected for user ${user.id} (${sseClients.get(user.id)!.size} total)`);

    // Keep-alive ping every 25 seconds
    const ping = setInterval(() => {
      try { res.write(": ping\n\n"); } catch { clearInterval(ping); }
    }, 25000);

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(ping);
      sseClients.get(user.id)?.delete(res);
      console.log(`[SSE] Client disconnected for user ${user.id}`);
    });
  });

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
          const data = await buildDashboardSummary(user.id);
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

          const today = new Date().toISOString().split("T")[0];
          const existingPlan = await getPlanByDate(user.id, today);

          if (existingPlan) {
            const exercises =
              typeof existingPlan.exercises === "string"
                ? JSON.parse(existingPlan.exercises)
                : existingPlan.exercises;
            const formatted = formatWorkoutForChat({ ...existingPlan, exercises });
            broadcastToUser(user.id, "dashboard-update", { plans: true });
            return res.json({ text: `Here's your workout for today (already generated earlier):\n\n${formatted}`, updates: { plans: true } });
          }

          // Build history map for progressive overload
          const recentFocuses = await getRecentFocuses(user.id, 4);
          const todayFocus = decideSplit(profile.workout_days ?? 3, recentFocuses);
          const lastPlan = await getLatestPlan(user.id);
          const historyMap = new Map<string, any>();

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

          const prompt = buildWorkoutPrompt(profile, todayFocus, recentFocuses, historyMap);
          const generatedPlan = await callWorkoutAI(prompt);
          await savePlan(user.id, today, generatedPlan, prompt);
          await saveToChatbotLog(user.id, generatedPlan);

          const formatted = formatWorkoutForChat(generatedPlan);

          broadcastToUser(user.id, "dashboard-update", { plans: true });
          return res.json({ text: formatted, updates: { plans: true } });
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

          broadcastToUser(user.id, "dashboard-update", { plans: true });
          return res.json({ text: responseText, updates: { plans: true } });
        } catch (nutriErr: any) {
          console.error("[Chat/Nutrition Gen] Error:", nutriErr.message);
        }
      }

      // ── Nutrition Log trigger ──────────────────────────────────────────────
      if (user && message && NUTRITION_LOG_RE.test(message)) {
        try {
          const { logFoodIntake } = await import("./services/nutrition.service.js");
          const log = await logFoodIntake(user.id, message);

          broadcastToUser(user.id, "dashboard-update", { progress: true });
          return res.json({
            text: `✅ Logged: **${log.food_item}**\n🔥 Calories: ${log.calories} kcal\n💪 Protein: ${log.protein}g | 🍞 Carbs: ${log.carbs}g | 🥑 Fats: ${log.fats}g`,
            updates: { progress: true }
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
You are the high-energy, motivating virtual assistant for STRIVA.
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
Whenever the user provides ANY fitness-related information in their message, YOU MUST append a structured JSON block at the VERY END of your response inside triple backticks. This JSON is parsed by the dashboard to automatically update all fitness tracking sections — do NOT skip it when relevant data is present.

Full JSON schema (only include keys relevant to this specific message — omit irrelevant ones):
\`\`\`json
{
  "profile_update": {
    "goal": "muscle gain",
    "weight_kg": 75,
    "height_cm": 178,
    "age": 25,
    "diet_type": "vegetarian",
    "activity_level": "active",
    "workout_days": 4
  },
  "macro_goals": {
    "calories": 2500,
    "protein": 180,
    "carbs": 250,
    "fats": 65
  },
  "workout_plan": "Detailed per-day workout chart as markdown...",
  "diet_plan": "Fully detailed meal plan as markdown...",
  "progress_log": {
    "workout_name": "Chest & Triceps",
    "workout_completed": true,
    "muscle_group": "chest",
    "calories_consumed": 2400,
    "calories_burned": 350,
    "protein": 120,
    "carbs": 200,
    "fats": 55,
    "water_ml": 2000,
    "body_weight_kg": 80,
    "cardio_type": "running",
    "cardio_duration_min": 30,
    "cardio_distance_km": 5,
    "exercises": [
      { "name": "Bench Press", "sets": 4, "reps": "8-10", "weight_kg": 80 },
      { "name": "Tricep Pushdown", "sets": 3, "reps": "12", "weight_kg": 25 }
    ]
  },
  "memory": "User has a bad left knee and only trains with dumbbells."
}
\`\`\`

Detailed rules for the JSON block — read carefully:
1. "profile_update": Include ONLY when the user states a new goal, weight, height, age, or diet type. weight_kg must be a number.
2. "macro_goals": Include when you calculate or the user states their target daily calories/macros.
3. "workout_plan" & "diet_plan": Include as detailed markdown strings only when explicitly asked to generate a plan.
4. "progress_log": Include whenever the user mentions ANYTHING they did today — completed a workout, ate a meal, drank water, went for a run, updated their weight. Be generous in interpreting these:
   - Workout completed → set workout_name, workout_completed: true, muscle_group
   - Food/meal eaten → set calories_consumed, protein, carbs, fats (estimate if not stated)
   - Water drunk → set water_ml (convert litres to ml: 2L = 2000)
   - Weight check → set body_weight_kg
   - Cardio done → set cardio_type (running/cycling/swimming/walking/hiit etc.), cardio_duration_min, cardio_distance_km, calories_burned
   - Individual exercises → populate the exercises array with name, sets, reps, weight_kg
5. "memory": Include a concise one-sentence summary of any NEW permanent fact about the user (injuries, equipment, preferences). Do NOT repeat already-known facts.
6. IMPORTANT: The JSON block is strictly for internal data parsing and is completely invisible to the user. Do NOT mention or refer to "JSON block", "JSON", "schema", "database updates", or any internal data processing mechanics in your conversational reply. Do NOT append parenthetical notes, reminders, or warnings about updating their profile or progress log (e.g., do NOT write "(Remember, I'll update the JSON block...)"). Only output clean, natural, and encouraging coaching responses.
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

      // ── Centralized AI data extraction (aiDataParser.service.ts) ────────────
      let updates = {
        userProfile: false,
        progress: false,
        plans: false,
        hydration: false,
        weight: false,
        activity: false,
        macros: false,
      };

      if (user) {
        try {
          const { cleanedText, updates: parsedUpdates, newProfileContext } =
            await parseAndApplyAIData(aiContent, user.id, {
              profile_context: user.profile_context,
              weight_kg: undefined, // fetched inside parser if needed
            });

          // Apply cleaned text (JSON block stripped)
          aiContent = cleanedText;

          // Merge update flags
          Object.assign(updates, parsedUpdates);

          // Sync in-memory profile_context if memory was saved
          if (newProfileContext) {
            user.profile_context = newProfileContext;
          }
        } catch (parseErr: any) {
          console.error("[Chat] aiDataParser error (non-fatal):", parseErr.message);
        }
      }

      // ── Build user-friendly suffix messages ──────────────────────────────
      const suffixes: string[] = [];
      if (updates.progress) suffixes.push("*(✅ Progress logged to your dashboard!)*");
      if (updates.hydration) suffixes.push("*(💧 Hydration updated!)*");
      if (updates.weight) suffixes.push("*(⚖️ Body weight logged!)*");
      if (updates.activity) suffixes.push("*(🏃 Activity recorded!)*");
      if (updates.plans) suffixes.push("*(📋 New plan attached to your Daily Protocol!)*");
      if (updates.macros) suffixes.push("*(🎯 Macro goals updated!)*");
      if (suffixes.length > 0) aiContent += "\n\n" + suffixes.join(" ");

      // ── Real-time SSE push to all browser tabs of this user ──────────────
      if (user && Object.values(updates).some(Boolean)) {
        broadcastToUser(user.id, "dashboard-update", updates);
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
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Daily Cron Job for Memberships
  // ───────────────────────────────────────────────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily membership status update...');
    try {
      const today = new Date().toISOString().split('T')[0];
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Mark as expired where expiry_date < today and status != expired
      const { data: expired } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'expired' })
        .lt('expiry_date', today)
        .neq('status', 'expired')
        .select('user_id');

      if (expired && expired.length > 0) {
        console.log(`Marked ${expired.length} memberships as expired.`);
        for (const m of expired) {
          await supabaseAdmin.from('user_workout_assignments').update({ active: false }).eq('user_id', m.user_id);
          await supabaseAdmin.from('user_diet_assignments').update({ active: false }).eq('user_id', m.user_id);
        }
      }

      // Mark as due_soon where expiry_date <= in7Days and status == 'active'
      await supabaseAdmin
        .from('memberships')
        .update({ status: 'due_soon' })
        .lte('expiry_date', in7Days)
        .eq('status', 'active');

      console.log('Membership statuses updated successfully.');
    } catch (err) {
      console.error('Failed to run daily membership cron:', err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
