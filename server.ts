import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EventEmitter } from "events";
import bcrypt from "bcryptjs";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string;
      name: string;
      email: string;
      avatar: string;
      profile_context?: string;
    }
  }
}

const authEvents = new EventEmitter();

async function initDB() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      google_id VARCHAR(255) UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      avatar VARCHAR(255),
      profile_context TEXT,
      chat_id VARCHAR(255),
      password VARCHAR(255),
      phone VARCHAR(255) UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
      water_goal INT DEFAULT 2000,
      calorie_goal INT DEFAULT 0,
      protein_goal INT DEFAULT 0,
      carb_goal INT DEFAULT 0,
      fat_goal INT DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      date VARCHAR(255),
      workout_name VARCHAR(255),
      calories INT,
      protein INT,
      water INT,
      carbs INT DEFAULT 0,
      fats INT DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS daily_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      date VARCHAR(255),
      workout_plan TEXT,
      diet_plan TEXT,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_date (user_id, date)
    );`
  ];

  for (const sql of statements) {
    try {
      await db.query(sql);
    } catch (e) {
      console.error("Error creating table:", e, "\nQuery:", sql);
    }
  }

  const alterStatements = [
    "ALTER TABLE progress ADD COLUMN carbs INT DEFAULT 0;",
    "ALTER TABLE progress ADD COLUMN fats INT DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN profile_context TEXT;",
    "ALTER TABLE users ADD COLUMN chat_id VARCHAR(255);",
    "ALTER TABLE users ADD COLUMN password VARCHAR(255);",
    "ALTER TABLE users ADD COLUMN phone VARCHAR(255);",
    "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN water_goal INT DEFAULT 2000;",
    "ALTER TABLE users ADD COLUMN calorie_goal INT DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN protein_goal INT DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN carb_goal INT DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN fat_goal INT DEFAULT 0;"
  ];
  for (const sql of alterStatements) {
    try {
      await db.query(sql);
    } catch (e) {
      // Ignore if it already exists
    }
  }
}

async function startServer() {
  await initDB();

  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(session({
    secret: process.env.NEXTAUTH_SECRET || "sweat-fix-secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log("Deserializing user ID:", id);
    try {
      const [rows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
      done(null, rows[0]);
    } catch (e) {
      done(e, null);
    }
  });

  const callbackURL = process.env.NODE_ENV === 'production'
    ? `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/google/callback`
    : `http://localhost:3000/auth/google/callback`;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    callbackURL: callbackURL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let [rows]: any = await db.execute("SELECT * FROM users WHERE google_id = ?", [profile.id]);
      let user = rows[0];
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (!user) {
        const [info]: any = await db.execute(
          "INSERT INTO users (google_id, name, email, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)",
          [profile.id, profile.displayName, profile.emails?.[0].value, profile.photos?.[0].value, now, now]
        );
        const [newRows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [info.insertId]);
        user = newRows[0];
      } else {
        await db.execute("UPDATE users SET last_login = ? WHERE id = ?", [now, user.id]);
        const [updatedRows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [user.id]);
        user = updatedRows[0];
      }
      return done(null, user);
    } catch (e) {
      return done(e, undefined);
    }
  }));

  app.get("/api/auth/google", (req, res, next) => {
    const state = req.query.state ? String(req.query.state) : undefined;
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      state: state
    })(req, res, next);
  });

  app.post("/api/auth/demo", async (req, res) => {
    try {
      let [rows]: any = await db.execute("SELECT * FROM users WHERE email = ?", ["demo@sweatfix.com"]);
      let user = rows[0];
      if (!user) {
        const [info]: any = await db.execute(
          "INSERT INTO users (email, name, avatar, profile_context, water_goal) VALUES (?, ?, ?, ?, ?)",
          ["demo@sweatfix.com", "Demo User", "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo", "", 2000]
        );
        const [newRows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [info.insertId]);
        user = newRows[0];
      } else {
        try {
          await db.execute("DELETE FROM progress WHERE user_id = ?", [user.id]);
          await db.execute("DELETE FROM daily_plans WHERE user_id = ?", [user.id]);
          await db.execute("UPDATE users SET profile_context = '', name = 'Demo User' WHERE id = ?", [user.id]);
        } catch (e) {
          console.error("Failed to reset demo data:", e);
        }
      }

      (req as any).login(user, (err: any) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        (req as any).session.save((err: any) => {
          if (err) return res.status(500).json({ error: "Session save failed" });
          res.json(user);
        });
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), async (req, res) => {
    const state = req.query.state as string;
    const user = (req as any).user;

    if (state && user) {
      try {
        await db.execute("UPDATE users SET chat_id = ? WHERE id = ?", [state, user.id]);
        console.log(`[BOT TICK] Triggering success message for Chat ID: ${state} - User: ${user.name}`);
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
  });

  app.get("/api/me", (req, res) => {
    const user = (req as any).user;
    console.log("Checking /api/me, user found:", !!user);
    res.json(user || null);
  });

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

  app.put("/api/user", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, water_goal } = req.body;

    try {
      if (name && typeof name === "string") {
        await db.execute("UPDATE users SET name = ? WHERE id = ?", [name.trim(), user.id]);
      }
      if (water_goal !== undefined) {
        await db.execute("UPDATE users SET water_goal = ? WHERE id = ?", [Number(water_goal), user.id]);
      }
      const [rows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [user.id]);
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/progress", async (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    try {
      const [data]: any = await db.execute("SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC LIMIT 7", [userId]);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/progress", async (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { date, workout_name, calories, protein, water, carbs, fats } = req.body;
    try {
      await db.execute(
        "INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, date, workout_name, calories, protein, water, carbs || 0, fats || 0]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/plans", async (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    try {
      const [data]: any = await db.execute("SELECT * FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT 14", [userId]);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/plans", async (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { date, workout_plan, diet_plan } = req.body;
    try {
      await db.execute(`
        INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed) 
        VALUES (?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE 
          workout_plan = VALUES(workout_plan), 
          diet_plan = VALUES(diet_plan)
      `, [userId, date, workout_plan, diet_plan]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/plans/:id/complete", async (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { completed } = req.body;
    try {
      await db.execute("UPDATE daily_plans SET completed = ? WHERE id = ? AND user_id = ?", [
        completed ? 1 : 0, req.params.id, userId
      ]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  async function getOpenRouterResponse(userMessage: string, history: any[], systemMessage: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Missing Authentication: OPENROUTER_API_KEY is not defined in the environment or .env file.");
    }

    const messages = [{ role: "system", content: systemMessage }];
    for (const h of history) {
      const role = h.role === "model" || h.role === "assistant" ? "assistant" : "user";
      const content = h.parts && h.parts.length > 0 ? h.parts[0].text : h.content || "";
      if (content) messages.push({ role, content });
    }
    messages.push({ role: "user", content: userMessage });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Sweat Fix Gym"
      },
      body: JSON.stringify({
        model: "arcee-ai/trinity-large-preview:free",
        messages,
        temperature: 0.8,
        top_p: 0.8,
        top_k: 50
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMessage = typeof errJson.error === 'string' ? errJson.error : errJson.error?.message;
      throw new Error(errorMessage || "OpenRouter API Error");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I encountered an error.";
  }

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const user = (req as any).user;

      let userContextStr = "";
      if (user && user.profile_context) {
        userContextStr = `\n\nUSER PROFILE CONTEXT (Remember this!):\n${user.profile_context}`;
      }

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

Auto-Fill Protocol:
ONLY ONCE you have gathered the user's details, you can generate a highly accurate, customized diet and workout plan.
The generated plans must be highly detailed. The workout chart must be a detailed per-day plan, and the diet plan must be broken down specifically by their preferred number of meals per day with full macro details.
Whenever you generate this specific plan for the day, YOU MUST append a JSON block at the very end of your response inside triple backticks like this:
\`\`\`json
{
  "workout_plan": "Detailed per-day workout chart",
  "diet_plan": "Fully detailed diet plan explicitly structured by their preferred meal frequency",
  "macro_goals": {
    "calories": 2500,
    "protein": 180,
    "carbs": 250,
    "fats": 65
  }
}
\`\`\`
This JSON will be used to automatically update their Daily Protocol dashboard. Keep the JSON properties exactly as "workout_plan", "diet_plan", and "macro_goals", providing realistic autofill data based on the conversation.

Memory Extraction Context:
Whenever the user explicitly tells you a fact about themselves that would be important to remember for future workouts or diets (such as injuries, available equipment, target weight, dietary restrictions, schedule constraints, etc.), YOU MUST add a third property to the JSON block called "memory" that concisely summarizes the new fact.
Example:
\`\`\`json
{
  "workout_plan": "...",
  "diet_plan": "...",
  "memory": "User has a bad left knee and only has access to dumbbells."
}
\`\`\`
If there is no new fact to save in this message, do not include the "memory" property. Do not just repeat existing memory.

Progress & Macro Extraction Protocol:
If the user indicates they just completed a workout, drank water, or ate a meal, YOU MUST estimate the caloric/nutritional value and add a "progress_log" property to the JSON block.
Example:
\`\`\`json
{
  "workout_plan": "...",
  "diet_plan": "...",
  "progress_log": {
    "workout_name": "Chicken Breast & Rice",
    "calories": 450,
    "protein": 45,
    "carbs": 50,
    "fats": 5,
    "water": 0
  }
}
\`\`\`
If there is no completed meal or workout to log, do not include "progress_log".${userContextStr}`;

      let aiContent: string;
      try {
        aiContent = await getOpenRouterResponse(message, history || [], systemPrompt);
      } catch (apiError: any) {
        console.error("OpenRouter API Error:", apiError.message);
        return res.json({
          text: `⚠️ **Connection Error**: I'm currently unable to reach my training servers. Please check your API key or try again in a moment. (${apiError.message})`
        });
      }

      if (user) {
        const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.memory) {
              const currentContext = user.profile_context ? user.profile_context + "\n" : "";
              const newContext = currentContext + "- " + parsed.memory;
              await db.execute("UPDATE users SET profile_context = ? WHERE id = ?", [newContext, user.id]);
              user.profile_context = newContext;
              console.log("Saved new memory for user", user.id, ":", parsed.memory);
            }
            if (parsed.macro_goals) {
              const mg = parsed.macro_goals;
              await db.execute(
                "UPDATE users SET calorie_goal = ?, protein_goal = ?, carb_goal = ?, fat_goal = ? WHERE id = ?",
                [mg.calories || 0, mg.protein || 0, mg.carbs || 0, mg.fats || 0, user.id]
              );
              console.log("Saved new macro goals for user", user.id, ":", mg);
            }
            if (parsed.progress_log) {
              const p = parsed.progress_log;
              const today = new Date().toISOString().split('T')[0];
              await db.execute(
                "INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [user.id, today, p.workout_name || "Log", p.calories || 0, p.protein || 0, p.water || 0, p.carbs || 0, p.fats || 0]
              );
              console.log("Saved new progress log for user", user.id, ":", p);
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
