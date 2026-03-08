import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EventEmitter } from "events";
import bcrypt from "bcryptjs";

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

const db = new Database("gym.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    avatar TEXT,
    profile_context TEXT,
    chat_id TEXT,
    password TEXT,
    phone TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    workout_name TEXT,
    calories INTEGER,
    protein INTEGER,
    water INTEGER,
    carbs INTEGER DEFAULT 0,
    fats INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    workout_plan TEXT,
    diet_plan TEXT,
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );
`);

try { db.exec("ALTER TABLE progress ADD COLUMN carbs INTEGER DEFAULT 0;"); } catch (e) { /* Ignore if it already exists */ }
try { db.exec("ALTER TABLE progress ADD COLUMN fats INTEGER DEFAULT 0;"); } catch (e) { /* Ignore if it already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN profile_context TEXT;"); } catch (e) { /* Ignore if it already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN chat_id TEXT;"); } catch (e) { /* Ignore if it already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN password TEXT;"); } catch (e) { /* Ignore if it already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;"); } catch (e) { /* Ignore if it already exists */ }

const authEvents = new EventEmitter();

async function startServer() {
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
  passport.deserializeUser((id: number, done) => {
    console.log("Deserializing user ID:", id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    done(null, user);
  });

  const callbackURL = process.env.NODE_ENV === 'production'
    ? `${process.env.NEXTAUTH_URL || process.env.APP_URL}/auth/google/callback`
    : `http://localhost:3000/auth/google/callback`;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "placeholder",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    callbackURL: callbackURL,
  }, (accessToken, refreshToken, profile, done) => {
    let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(profile.id);
    if (!user) {
      const info = db.prepare("INSERT INTO users (google_id, name, email, avatar) VALUES (?, ?, ?, ?)").run(
        profile.id,
        profile.displayName,
        profile.emails?.[0].value,
        profile.photos?.[0].value
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    }
    return done(null, user);
  }));

  // Auth Routes
  app.get("/api/auth/google", (req, res, next) => {
    const state = req.query.state ? String(req.query.state) : undefined;
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      state: state
    })(req, res, next);
  });

  // Demo Login
  app.post("/api/auth/demo", (req, res) => {
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get("demo@sweatfix.com");
    if (!user) {
      const info = db.prepare("INSERT INTO users (email, name, avatar, profile_context) VALUES (?, ?, ?, ?)").run(
        "demo@sweatfix.com",
        "Demo User",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
        ""
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    } else {
      // Refresh the demo user's state by clearing all their data
      try {
        db.prepare("DELETE FROM progress WHERE user_id = ?").run(user.id);
        db.prepare("DELETE FROM daily_plans WHERE user_id = ?").run(user.id);
        db.prepare("UPDATE users SET profile_context = '', name = 'Demo User' WHERE id = ?").run(user.id);
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
  });

  app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), (req, res) => {
    const state = req.query.state as string;
    const user = (req as any).user;

    if (state && user) {
      // It's a chatbot login
      try {
        db.prepare("UPDATE users SET chat_id = ? WHERE id = ?").run(state, user.id);
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
      // Standard web application login
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

  // Web Bot Polling Endpoint
  app.get("/api/auth/status/:chat_id", (req, res) => {
    const chatId = req.params.chat_id;
    const timeout = setTimeout(() => {
      authEvents.removeAllListeners(`auth_success_${chatId}`);
      res.json({ status: "pending" });
    }, 30000); // 30 second long-polling

    authEvents.once(`auth_success_${chatId}`, (user) => {
      clearTimeout(timeout);
      res.json({ status: "success", user });
    });
  });

  app.get("/api/logout", (req, res) => {
    (req as any).logout(() => res.json({ success: true }));
  });

  app.put("/api/user", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid name" });
    }

    try {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), user.id);
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
      res.json(updatedUser);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Progress Routes
  app.get("/api/progress", (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const data = db.prepare("SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC LIMIT 7").all(userId);
    res.json(data);
  });

  app.post("/api/progress", (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { date, workout_name, calories, protein, water, carbs, fats } = req.body;
    db.prepare("INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      userId, date, workout_name, calories, protein, water, carbs || 0, fats || 0
    );
    res.json({ success: true });
  });

  // Daily Plans Routes
  app.get("/api/plans", (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const data = db.prepare("SELECT * FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT 14").all(userId);
    res.json(data);
  });

  app.post("/api/plans", (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { date, workout_plan, diet_plan } = req.body;
    db.prepare(`
      INSERT INTO daily_plans (user_id, date, workout_plan, diet_plan, completed) 
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(user_id, date) DO UPDATE SET 
        workout_plan = excluded.workout_plan, 
        diet_plan = excluded.diet_plan
    `).run(userId, date, workout_plan, diet_plan);
    res.json({ success: true });
  });

  app.put("/api/plans/:id/complete", (req, res) => {
    if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
    const userId = ((req as any).user as any).id;
    const { completed } = req.body;
    db.prepare("UPDATE daily_plans SET completed = ? WHERE id = ? AND user_id = ?").run(
      completed ? 1 : 0, req.params.id, userId
    );
    res.json({ success: true });
  });

  // OpenRouter API Connector
  async function getOpenRouterResponse(userMessage: string, history: any[], systemMessage: string): Promise<string> {
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
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
        "Content-Type": "application/json"
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

  // Chat Route
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
3. Brevity: Keep all responses under 3 to 4 sentences unless specifically asked to list out a workout routine.

Interaction Structure
Onboarding & Details Gathering: Before creating any diet or workout plan, you MUST politely ask the user to provide their current details if they haven't already. Specifically, ask for:
1. Current weight & height
2. Primary fitness goal (e.g., cut, bulk, bodyweight mastery)
3. Dietary restrictions
4. Available equipment
DO NOT generate a plan until you have this information.

Auto-Fill Protocol:
ONLY ONCE you have gathered the user's details, you can generate a highly accurate, customized diet and workout plan.
Whenever you generate this specific plan for the day, YOU MUST append a JSON block at the very end of your response inside triple backticks like this:
\`\`\`json
{
  "workout_plan": "Short summary of the workout plan",
  "diet_plan": "Short summary of the diet plan"
}
\`\`\`
This JSON will be used to automatically update their Daily Protocol dashboard. Keep the JSON properties exactly as "workout_plan" and "diet_plan", providing realistic autofill data based on the conversation.

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

      // Extract new memory from JSON if present and save it
      if (user) {
        const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.memory) {
              const currentContext = user.profile_context ? user.profile_context + "\\n" : "";
              const newContext = currentContext + "- " + parsed.memory;
              db.prepare("UPDATE users SET profile_context = ? WHERE id = ?").run(newContext, user.id);
              // Update user object in memory just to keep it synced for potential subsequent calls
              user.profile_context = newContext;
              console.log("Saved new memory for user", user.id, ":", parsed.memory);
            }
            if (parsed.progress_log) {
              const p = parsed.progress_log;
              const today = new Date().toISOString().split('T')[0];
              db.prepare("INSERT INTO progress (user_id, date, workout_name, calories, protein, water, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
                user.id, today, p.workout_name || "Log", p.calories || 0, p.protein || 0, p.water || 0, p.carbs || 0, p.fats || 0
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

  // Vite middleware for development
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
