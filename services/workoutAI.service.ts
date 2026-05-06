/**
 * services/workoutAI.service.ts
 * AI prompt engineering + split logic + progressive overload.
 * Isolated from HTTP and DB concerns — receives plain data, returns WorkoutPlan.
 */
import { WorkoutPlan, Exercise } from "./workout.service.js";
import { callAIWithRouting, parseJSONResponse, MODELS } from "./ai.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  goal?:           string;
  activity_level?: string;
  workout_days?:   number;
  weight_kg?:      number;
  age?:            number;
}

export interface ExerciseHistory {
  name:        string;
  weight_used: number | null;
  reps_done:   string | null;
  difficulty:  number | null;   // 1–5
}

// ─────────────────────────────────────────────────────────────────────────────
// Split rotation maps
// ─────────────────────────────────────────────────────────────────────────────

const SPLIT_3DAY = ["Push Day", "Pull Day", "Leg Day"];
const SPLIT_4DAY = ["Push Day", "Pull Day", "Leg Day", "Full Body"];
const SPLIT_5DAY = ["Push Day", "Pull Day", "Leg Day", "Full Body", "Active Recovery"];
const SPLIT_6DAY = ["Push Day", "Pull Day", "Leg Day", "Push Day", "Pull Day", "Leg Day"];

/**
 * Determine today's split focus based on:
 *  - How many days/week the user trains
 *  - What muscle groups they've hit recently
 */
export function decideSplit(workoutDays: number, recentFocuses: string[]): string {
  let sequence: string[];

  if (workoutDays <= 1) return "Full Body";
  if (workoutDays === 2) return recentFocuses[0] === "Upper Body" ? "Lower Body" : "Upper Body";
  if (workoutDays === 3) sequence = SPLIT_3DAY;
  else if (workoutDays === 4) sequence = SPLIT_4DAY;
  else if (workoutDays === 5) sequence = SPLIT_5DAY;
  else sequence = SPLIT_6DAY;

  // Find the last known focus in our sequence and advance by one
  const lastFocus = recentFocuses[0];
  if (!lastFocus) return sequence[0]; // no history → start at beginning

  const lastIdx = sequence.findIndex(
    (s) => s.toLowerCase() === lastFocus.toLowerCase()
  );
  if (lastIdx === -1) return sequence[0]; // unknown focus → restart

  return sequence[(lastIdx + 1) % sequence.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Progressive overload helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given an exercise's last log, compute the suggested next weight and reps.
 *
 * Overload rules:
 *  - difficulty ≤ 2 (easy)      → +5 kg
 *  - difficulty 3 (moderate)    → +2.5 kg
 *  - difficulty 4 (hard)        → same weight, +1 rep
 *  - difficulty 5 (very hard)   → same weight, same reps (consolidate)
 *  - no difficulty data          → +2.5 kg as safe default
 */
function applyProgressiveOverload(history: ExerciseHistory): {
  weight: string;
  reps:   string;
} {
  const prevWeight = history.weight_used ?? 0;
  const prevReps   = history.reps_done ?? "8-10";
  const difficulty = history.difficulty;

  let weight: number;
  let reps = prevReps;

  if (!difficulty || difficulty <= 2) {
    weight = prevWeight + 5;
  } else if (difficulty === 3) {
    weight = prevWeight + 2.5;
  } else if (difficulty === 4) {
    weight = prevWeight;
    // Bump upper bound of rep range by 1
    reps = bumpReps(prevReps);
  } else {
    // difficulty 5 — consolidate this weight first
    weight = prevWeight;
  }

  return {
    weight: weight > 0 ? `${weight} kg` : "bodyweight",
    reps,
  };
}

function bumpReps(repsStr: string): string {
  // Handles formats like "8-10", "10", "12-15"
  const match = repsStr.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return repsStr;
  const lo = parseInt(match[1], 10);
  const hi = match[2] ? parseInt(match[2], 10) + 1 : lo + 1;
  return match[2] ? `${lo}-${hi}` : `${hi}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the structured prompt string to send to the AI.
 */
export function buildWorkoutPrompt(
  profile:       UserProfile,
  todayFocus:    string,
  recentFocuses: string[],
  historyMap:    Map<string, ExerciseHistory>
): string {
  const goal          = profile.goal           ?? "general fitness";
  const activityLevel = profile.activity_level ?? "active";
  const weight        = profile.weight_kg      ?? 70;
  const age           = profile.age            ?? 25;

  const prevSplitsStr = recentFocuses.length > 0
    ? recentFocuses.join(", ")
    : "None — this is the first session";

  const overloadLines: string[] = [];
  for (const [name, history] of historyMap.entries()) {
    const { weight: suggestedWeight, reps: suggestedReps } = applyProgressiveOverload(history);
    overloadLines.push(
      `  - ${name}: last used ${history.weight_used ?? 0} kg × ${history.reps_done ?? "?"} reps → suggest ${suggestedWeight} × ${suggestedReps} reps`
    );
  }
  const overloadSection = overloadLines.length > 0
    ? `PROGRESSIVE OVERLOAD SUGGESTIONS:\n${overloadLines.join("\n")}`
    : "PROGRESSIVE OVERLOAD: No previous logs — start with moderate working weights.";

  return `You are a professional personal trainer AI. Your task is to generate a single structured workout plan.

USER PROFILE:
- Goal: ${goal}
- Activity Level: ${activityLevel}
- Body Weight: ${weight} kg
- Age: ${age}

TODAY'S SPLIT: ${todayFocus}
Recent splits (DO NOT repeat these muscle groups today): ${prevSplitsStr}

${overloadSection}

INSTRUCTIONS:
- Generate 5–7 exercises appropriate for ${todayFocus}.
- Use compound movements first, then isolation exercises.
- Set counts: 3–5 sets per exercise. Reps vary by goal (strength = lower reps, hypertrophy = 8–12, endurance = 15+).
- Respect the progressive overload suggestions above where applicable.
- Duration should be realistic (40–60 min for most splits, 30 min for Active Recovery).

Respond with ONLY valid JSON in exactly this format (no extra text, no markdown, no backticks):
{
  "focus": "${todayFocus}",
  "duration": "45 min",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": 4,
      "reps": "8-10",
      "weight": "70 kg",
      "muscle_group": "Chest",
      "notes": "progressive overload from last session"
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter caller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send the workout prompt to OpenRouter and parse the JSON response.
 * Throws if the AI response is not valid JSON or if the API errors.
 */
export async function callWorkoutAI(prompt: string): Promise<WorkoutPlan> {
  const rawResponse = await callAIWithRouting(prompt, "", [], MODELS.PLANNER);
  
  let plan: WorkoutPlan;
  try {
    plan = parseJSONResponse(rawResponse);
  } catch (e: any) {
    throw new Error(`AI returned non-JSON response: ${e.message}`);
  }

  // Basic shape validation
  if (!plan.focus || !Array.isArray(plan.exercises)) {
    throw new Error("AI response missing required fields (focus / exercises).");
  }

  return plan;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat-facing formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a WorkoutPlan into a rich markdown string for chatbot display.
 */
export function formatWorkoutForChat(plan: WorkoutPlan): string {
  const header  = `💪 **${plan.focus} — ${plan.duration}**\n`;
  const divider = `\n---\n`;

  const tableHeader = `| Exercise | Sets | Reps | Weight |\n|---|---|---|---|`;
  const tableRows   = plan.exercises
    .map(
      (ex: Exercise) =>
        `| ${ex.name} | ${ex.sets} | ${ex.reps} | ${ex.weight} |`
    )
    .join("\n");

  const muscleNotes = plan.exercises
    .filter((ex: Exercise) => ex.notes)
    .map((ex: Exercise) => `> 📝 **${ex.name}**: ${ex.notes}`)
    .join("\n");

  const cta = `\n\n🔥 Ready to crush it? Tap **Start Workout** below to begin tracking your sets!`;

  return [header, tableHeader, tableRows, muscleNotes ? divider + muscleNotes : "", cta].join("\n");
}
