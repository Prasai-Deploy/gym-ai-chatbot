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
import cron from "node-cron";

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
      age?: number;
      weight?: number;
      height?: number;
      gender?: string;
      fitness_goal?: string;
      role: 'free' | 'premium' | 'admin';
      streak: number;
      last_activity?: string;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MySQL connection pool
// ─────────────────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
  decimalNumbers: true,
});

// Helpers – thin wrappers so the rest of the code stays readable
async function dbGet(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await pool.execute(sql, params);
  return (rows as any[])[0] ?? null;
}

async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
}

async function dbRun(
  sql: string,
  params: any[] = []
): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params);
  const r = result as mysql.ResultSetHeader;
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
  } catch (err: any) {
    console.error("[DB] MySQL connection FAILED:", err.message);
    process.exit(1);
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
      let user = await dbGet(
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
      } else {
        // Refresh demo user state
        await dbRun("DELETE FROM progress WHERE user_id = ?", [user.id]);
        await dbRun("DELETE FROM daily_plans WHERE user_id = ?", [user.id]);
        await dbRun(
          "UPDATE users SET profile_context = '', name = 'Demo User' WHERE id = ?",
          [user.id]
        );
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

      if (state && user) {
        try {
          await dbRun("UPDATE users SET chat_id = ? WHERE id = ?", [
            state,
            user.id,
          ]);
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
    }
  );

  app.get("/api/me", (req, res) => {
    const user = (req as any).user;
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
    (req as any).logout(() => res.json({ success: true }));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Middleware: Role Security
  // ───────────────────────────────────────────────────────────────────────────
  const checkRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: "Premium feature. Please upgrade your role." });
      }
      next();
    };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Onboarding & Profile Updates
  // ───────────────────────────────────────────────────────────────────────────
  app.put("/api/onboarding", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { age, weight, height, gender, fitness_goal } = req.body;

    try {
      await dbRun(
        `UPDATE users SET age = ?, weight = ?, height = ?, gender = ?, fitness_goal = ? WHERE id = ?`,
        [age, weight, height, gender, fitness_goal, user.id]
      );
      const updatedUser = await dbGet("SELECT * FROM users WHERE id = ?", [user.id]);
      res.json(updatedUser);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
      
      // Update streak logic
      if (completed) {
        const today = new Date().toISOString().split("T")[0];
        const user = await dbGet("SELECT last_activity, streak FROM users WHERE id = ?", [userId]);
        let newStreak = (user.streak || 0) + 1;
        
        if (user.last_activity) {
          const last = new Date(user.last_activity);
          const diff = Math.floor((new Date(today).getTime() - last.getTime()) / (1000 * 3600 * 24));
          if (diff > 1) {
            newStreak = 1; // Streak broken
          } else if (diff === 0) {
            newStreak = user.streak; // Already updated today
          }
        }
        
        await dbRun("UPDATE users SET streak = ?, last_activity = ? WHERE id = ?", [newStreak, today, userId]);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Achievements Helper
  // ───────────────────────────────────────────────────────────────────────────
  async function awardAchievement(userId: number, badgeName: string, icon: string) {
    try {
      // Check if already earned
      const existing = await dbGet(
        "SELECT id FROM achievements WHERE user_id = ? AND badge_name = ?",
        [userId, badgeName]
      );
      if (existing) return;

      await dbRun(
        "INSERT INTO achievements (user_id, badge_name, badge_icon) VALUES (?, ?, ?)",
        [userId, badgeName, icon]
      );
      console.log(`User ${userId} earned badge: ${badgeName}`);
    } catch (e) {
      console.error("Error awarding achievement:", e);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Food Logs (Premium)
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/food-logs", checkRole(['premium', 'admin']), async (req, res) => {
    const userId = (req as any).user.id;
    try {
      const logs = await dbAll(
        "SELECT * FROM food_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 50",
        [userId]
      );
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/food-logs", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { food_name, calories, protein, carbs, fats, meal_type } = req.body;
    try {
      await dbRun(
        `INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fats, meal_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, food_name, calories, protein, carbs, fats, meal_type]
      );
      
      // Award "Nutrient Ninja" on first food log
      await awardAchievement(user.id, "Nutrient Ninja", "Utensils");
      
      // Also update the general progress for the charts
      const today = new Date().toISOString().split("T")[0];
      await dbRun(
        `INSERT INTO progress (user_id, date, workout_name, calories, protein, carbs, fats)
         VALUES (?, ?, 'Daily Nutrients', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           calories = calories + VALUES(calories),
           protein = protein + VALUES(protein),
           carbs = carbs + VALUES(carbs),
           fats = fats + VALUES(fats)`,
        [user.id, today, calories, protein, carbs, fats]
      );
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Stats & Weekly Reports
  // ───────────────────────────────────────────────────────────────────────────
  app.get("/api/stats/weekly", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    try {
      const stats = await dbAll(
        `SELECT date, SUM(calories) as total_calories, SUM(protein) as total_protein 
         FROM progress 
         WHERE user_id = ? 
         AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY date 
         ORDER BY date ASC`,
        [user.id]
      );
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Scheduler: Reminders
  // ───────────────────────────────────────────────────────────────────────────
  // Every day at 9 AM: Workout reminder
  cron.schedule("0 9 * * *", async () => {
    console.log("[CRON] Sending daily morning motivation...");
    // In a real app, this would send an FCM notification or email.
    // For now, we'll log it or store it in a notifications table if we had one.
  });

  // Every day at 2 PM: Water reminder
  cron.schedule("0 14 * * *", async () => {
    console.log("[CRON] Sending hydration reminder...");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // OpenRouter AI connector
  // ───────────────────────────────────────────────────────────────────────────
  async function getOpenRouterResponse(
    userMessage: string,
    history: any[],
    systemMessage: string
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "Missing Authentication: OPENROUTER_API_KEY is not defined in the environment or .env file."
      );
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemMessage },
    ];

    for (const h of history) {
      const role =
        h.role === "model" || h.role === "assistant" ? "assistant" : "user";
      const content =
        h.parts && h.parts.length > 0 ? h.parts[0].text : h.content || "";
      if (content) messages.push({ role, content });
    }
    messages.push({ role: "user", content: userMessage });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Sweat Fix Gym",
        },
        body: JSON.stringify({
          model: "arcee-ai/trinity-large-preview:free",
          messages,
          temperature: 0.8,
          top_p: 0.8,
          top_k: 50,
        }),
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMessage =
        typeof (errJson as any).error === "string"
          ? (errJson as any).error
          : (errJson as any).error?.message;
      throw new Error(errorMessage || "OpenRouter API Error");
    }

    const data = await response.json();
    return (data as any).choices?.[0]?.message?.content || "I encountered an error.";
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Chat route
  // ───────────────────────────────────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const user = (req as any).user;

      let userContextStr = "";
      if (user) {
        userContextStr = `\n\nUSER PROFILE:\n- Name: ${user.name}\n- Goal: ${user.fitness_goal || 'Not set'}\n- Biometrics: ${user.age || '?'} yrs, ${user.weight || '?'} kg, ${user.height || '?'} cm\n- Current Streak: ${user.streak} days\n- Context: ${user.profile_context || 'None'}`;
      }

      const systemPrompt = `Role & Identity
You are the world-class AI Fitness Coach for Sweat Fix Gym.
Your goal is to transform users into their best selves through data-driven personalization.

Tone: Professional, motivating, data-centric, and punchy.

Data Integration Rules:
1. Personalization: Use the user's BIOMETRICS (age, weight, height) and GOAL (fat loss, muscle gain) to tailor every response.
2. Proactive Suggestions: If the user hasn't logged enough protein or calories for their goal, proactively suggest specific adjustments.
   - Example: "I see your protein is low today. For muscle gain, try adding 30g of protein in your next meal."
3. Memory: Continue using the "memory" JSON property for long-term facts.

Interactive Structure:
- Onboarding: If biometrics are missing (marked as '?'), gently encourage the user to visit their Profile/Dashboard to complete onboarding.
- Detailed Plans: Generate detailed workout/diet plans only when requested.

JSON Protocol (Strict):
Append a JSON block for ANY updates:
\`\`\`json
{
  "workout_plan": "string",
  "diet_plan": "string",
  "macro_goals": { "calories": number, "protein": number, "carbs": number, "fats": number },
  "memory": "string (new fact only)",
  "progress_log": { "food_name": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "meal_type": "string" },
  "suggestion": "string (proactive tip)"
}
\`\`\`
Provide realistic estimations if the user describes a meal loosely. ${userContextStr}`;

      let aiContent: string;
      try {
        aiContent = await getOpenRouterResponse(
          message,
          history || [],
          systemPrompt
        );
      } catch (apiError: any) {
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

            if (parsed.memory) {
              const currentContext = user.profile_context
                ? user.profile_context + "\\n"
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
            }

            if (parsed.progress_log) {
              const p = parsed.progress_log;
              const today = new Date().toISOString().split("T")[0];
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
              console.log(
                "Saved new progress log for user",
                user.id,
                ":",
                p
              );
            }
          } catch (e) {
            console.error("Failed to parse AI JSON for memory/progress:", e);
          }
        }
      }

      res.json({ text: aiContent });
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
