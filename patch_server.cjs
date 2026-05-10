const fs = require('fs');
let src = fs.readFileSync('./server.ts', 'utf8');

// ── 1. Add aiDataParser import ──────────────────────────────────────────────
const i1 = 'import { getDailyStats, buildProgressInsight } from "./services/progress.service.js";';
const r1 = i1 + '\nimport { parseAndApplyAIData } from "./services/aiDataParser.service.js";';
if (src.includes(i1)) { src = src.replace(i1, r1); console.log('1. Import OK'); } else { console.log('1. MISS import'); }

// ── 2. SSE map after authEvents ─────────────────────────────────────────────
const i2 = 'const authEvents = new EventEmitter();';
const r2 = i2 + `

// SSE per-user clients
const sseClients = new Map();
function broadcastToUser(userId, event, data) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  const payload = 'event: ' + event + '\\ndata: ' + JSON.stringify(data) + '\\n\\n';
  for (const res of clients) { try { res.write(payload); } catch { clients.delete(res); } }
}`;
if (src.includes(i2)) { src = src.replace(i2, r2); console.log('2. SSE map OK'); } else { console.log('2. MISS authEvents'); }

// ── 3. SSE endpoint after progressRouter mount ──────────────────────────────
const i3 = '  app.use("/api/progress", progressRouter);\n\n  // ───────────────────────────────────────────────────────────────────────────\n  // Chat route';
const r3 = `  app.use("/api/progress", progressRouter);

  // SSE: GET /api/stream — real-time dashboard push
  app.get("/api/stream", (req, res) => {
    const user = req.user;
    if (!user) { res.status(401).end(); return; }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    if (!sseClients.has(user.id)) sseClients.set(user.id, new Set());
    sseClients.get(user.id).add(res);
    const ping = setInterval(() => { try { res.write(": ping\\n\\n"); } catch { clearInterval(ping); } }, 25000);
    req.on("close", () => { clearInterval(ping); sseClients.get(user.id)?.delete(res); });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Chat route`;
if (src.includes(i3)) { src = src.replace(i3, r3); console.log('3. SSE endpoint OK'); } else { console.log('3. MISS routerTarget'); }

// ── 4. Fix workout trigger — add saveAIWorkout/linkActivePlans/hydration/SSE ─
const i4 = `          const formatted = formatWorkoutForChat(generatedPlan);
          return res.json({ text: formatted });
        } catch (workoutErr: any) {
          console.error("[Chat/Workout trigger] Error:", workoutErr.message);
          // Fall through to normal AI chat on error
        }
      }`;
const r4 = `          // Save to chatbot_generated_workouts + link as active plan for dashboard
          const workoutObj = { title: generatedPlan.focus + ' - ' + today, exercises: generatedPlan.exercises, duration: generatedPlan.duration, difficulty: generatedPlan.difficulty, calories_estimate: generatedPlan.calories_estimate };
          const workoutId = await saveAIWorkout(user.id, workoutObj);
          await linkActivePlans(user.id, workoutId, undefined);
          await setHydrationGoal(user.id, 3500, true, "Increased hydration for your workout day!");
          await createActivity(user.id, 'chatbot', 'Workout Plan: ' + generatedPlan.focus, 'AI created ' + generatedPlan.focus + ' with ' + generatedPlan.exercises.length + ' exercises. Hydration set to 3.5L.');
          broadcastToUser(user.id, 'dashboard-update', { plans: true, hydration: true, activity: true });
          const formatted = formatWorkoutForChat(generatedPlan);
          return res.json({ text: formatted + "\\n\\n*(Plan saved to your dashboard!)*", updates: { plans: true, hydration: true, activity: true } });
        } catch (workoutErr: any) {
          console.error("[Chat/Workout trigger] Error:", workoutErr.message);
        }
      }`;
if (src.includes(i4)) { src = src.replace(i4, r4); console.log('4. Workout trigger OK'); } else { console.log('4. MISS workout trigger'); }

// ── 5. Fix workout early-return (missing updates flag) ───────────────────────
const i5 = 'return res.json({ text: `Here\'s your workout for today (already generated earlier):\\n\\n${formatted}` });';
const r5 = 'return res.json({ text: `Here\'s your workout for today (already generated earlier):\\n\\n${formatted}`, updates: { plans: true } });';
if (src.includes(i5)) { src = src.replace(i5, r5); console.log('5. Workout early-return OK'); } else { console.log('5. MISS workout early-return'); }

// ── 6. Fix nutrition gen trigger ─────────────────────────────────────────────
const i6 = `          return res.json({ text: responseText });
        } catch (nutriErr: any) {
          console.error("[Chat/Nutrition Gen] Error:", nutriErr.message);
        }
      }`;
const r6 = `          // Sync to dashboard tables
          const today = new Date().toISOString().split("T")[0];
          const protein = Math.round((plan.calories_target * 0.30) / 4);
          const carbs   = Math.round((plan.calories_target * 0.40) / 4);
          const fats    = Math.round((plan.calories_target * 0.30) / 9);
          const dietObj = { title: "Today's Meal Plan", meals: plan.meals, calories_target: plan.calories_target, protein, carbs, fats };
          const dietId = await saveAIDiet(user.id, dietObj);
          await linkActivePlans(user.id, undefined, dietId);
          await dbRun("UPDATE users SET calorie_goal=?, protein_goal=?, carb_goal=?, fat_goal=? WHERE id=?", [plan.calories_target, protein, carbs, fats, user.id]);
          await createActivity(user.id, 'chatbot', 'Meal Plan Generated', 'AI created meal plan targeting ' + plan.calories_target + ' kcal.');
          broadcastToUser(user.id, 'dashboard-update', { plans: true, macros: true, activity: true });
          responseText += "\\n\\n*(Meal plan saved to dashboard! Macro goals updated!)*";
          return res.json({ text: responseText, updates: { plans: true, macros: true, userProfile: true, activity: true } });
        } catch (nutriErr: any) {
          console.error("[Chat/Nutrition Gen] Error:", nutriErr.message);
        }
      }`;
if (src.includes(i6)) { src = src.replace(i6, r6); console.log('6. Nutrition gen OK'); } else { console.log('6. MISS nutrition gen'); }

// ── 7. Fix nutrition log trigger ─────────────────────────────────────────────
const i7 = `          return res.json({ \n            text: \`✅ Logged: **\${log.food_item}**\\n🔥 Calories: \${log.calories} kcal\\n💪 Protein: \${log.protein}g | 🍞 Carbs: \${log.carbs}g | 🥑 Fats: \${log.fats}g\`\n          });\n        } catch (logErr: any) {\n          console.error("[Chat/Nutrition Log] Error:", logErr.message);\n        }\n      }`;
const r7 = `          // Sync to dashboard
          const todayLog = new Date().toISOString().split("T")[0];
          await updateDailyProgress(user.id, todayLog, { calories_consumed: log.calories || 0, protein: log.protein || 0, carbs: log.carbs || 0, fats: log.fats || 0 });
          await logMeal(user.id, todayLog, { meal_type: "AI Log", food_item: log.food_item, calories: log.calories, protein: log.protein, carbs: log.carbs, fats: log.fats });
          await createActivity(user.id, 'chat', 'Meal Logged: ' + log.food_item, log.food_item + ' - ' + log.calories + ' kcal | P:' + log.protein + 'g C:' + log.carbs + 'g F:' + log.fats + 'g');
          broadcastToUser(user.id, 'dashboard-update', { progress: true, activity: true });
          return res.json({ text: 'Logged: **' + log.food_item + '** - ' + log.calories + ' kcal | P:' + log.protein + 'g C:' + log.carbs + 'g F:' + log.fats + 'g\\n\\n*(Dashboard updated!)*', updates: { progress: true, activity: true } });
        } catch (logErr: any) {
          console.error("[Chat/Nutrition Log] Error:", logErr.message);
        }
      }`;
if (src.includes(i7)) { src = src.replace(i7, r7); console.log('7. Nutrition log OK'); } else { console.log('7. MISS nutrition log'); }

// ── 8. Replace old inline JSON parser with parseAndApplyAIData ──────────────
const i8 = `      // Extract memory / macro_goals / progress_log / plans from AI JSON block
      let updates = {
        userProfile: false,
        progress: false,
        plans: false
      };`;
const r8 = `      // Centralized AI data extraction via aiDataParser
      let updates = {
        userProfile: false,
        progress:    false,
        plans:       false,
        hydration:   false,
        weight:      false,
        activity:    false,
        macros:      false,
      };`;
if (src.includes(i8)) { src = src.replace(i8, r8); console.log('8. Updates flags expanded OK'); } else { console.log('8. MISS updates flags'); }

// ── 9. Replace the if(user) JSON parsing block ───────────────────────────────
const i9 = `      if (user) {
        const jsonMatch = aiContent.match(/\`\`\`(?:json)?\\s+([\\s\\S]*?)\\s+\`\`\`/i);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);`;
const r9 = `      if (user) {
        try {
          const { cleanedText, updates: parsedUpdates, newProfileContext } =
            await parseAndApplyAIData(aiContent, user.id, { profile_context: user.profile_context });
          aiContent = cleanedText;
          Object.assign(updates, parsedUpdates);
          if (newProfileContext) user.profile_context = newProfileContext;
        } catch (parseErr) {
          console.error("[Chat] aiDataParser error (non-fatal):", parseErr.message);
        }
        // legacy block disabled — replaced by parseAndApplyAIData above
        if (false) { const parsed = {};`;
if (src.includes(i9)) { src = src.replace(i9, r9); console.log('9. Parser replaced OK'); } else { console.log('9. MISS parser block'); }

fs.writeFileSync('./server.ts', src, 'utf8');
console.log('All patches written.');
