/**
 * services/chatContext.service.ts
 * Builds the AI system-prompt context string from a user's fitness profile.
 */
import { FitnessProfileData, getMissingFields, isProfileComplete } from "./profile.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Context builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master function — returns the right context block for the system prompt.
 *
 * • No profile yet          → full onboarding instruction
 * • Profile partially filled → show existing data + list missing fields
 * • Profile complete         → rich structured context
 */
export function buildSystemContext(
  profile: any,
  legacyMemory?: string,
  progressInsight?: string
): string {
  const missing = getMissingFields(profile);

  if (!profile || missing.length === 7) {
    // ── Case 1: no profile at all ────────────────────────────────────────────
    return buildOnboardingBlock([], legacyMemory);
  }

  const contextLines = buildProfileLines(profile);

  if (missing.length > 0) {
    // ── Case 2: partial profile ──────────────────────────────────────────────
    return (
      buildProfileBlock(contextLines, legacyMemory) +
      buildOnboardingBlock(missing, legacyMemory, /* partial */ true)
    );
  }

  // ── Case 3: complete profile ─────────────────────────────────────────────
  return buildProfileBlock(contextLines, legacyMemory, progressInsight);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildProfileLines(profile: any): string[] {
  const lines: string[] = [];
  if (profile.goal)           lines.push(`Goal: ${capitalize(profile.goal)}`);
  if (profile.weight_kg)      lines.push(`Weight: ${profile.weight_kg} kg`);
  if (profile.height_cm)      lines.push(`Height: ${profile.height_cm} cm`);
  if (profile.age)            lines.push(`Age: ${profile.age}`);
  if (profile.diet_type)      lines.push(`Diet: ${capitalize(profile.diet_type)}`);
  if (profile.activity_level) lines.push(`Activity: ${capitalize(profile.activity_level)}`);
  if (profile.workout_days)   lines.push(`Workout Days/Week: ${profile.workout_days}`);
  return lines;
}

function buildProfileBlock(lines: string[], legacyMemory?: string, progressInsight?: string): string {
  let block = `\n\n[USER FITNESS PROFILE — personalise every response using this]\n${lines.join(" | ")}`;
  if (legacyMemory) {
    block += `\n[Memory Notes]\n${legacyMemory}`;
  }
  if (progressInsight) {
    block += `\n[WEEKLY PROGRESS TRENDS — use this to provide adaptive recommendations and specific praise]\n${progressInsight}`;
  }
  return block;
}

function buildOnboardingBlock(
  missing: string[],
  legacyMemory?: string,
  partial = false
): string {
  const missingList = missing.map((m, i) => `${i + 1}. ${m}`).join("\n");

  const intro = partial
    ? `\n\n[PROFILE INCOMPLETE — collect these missing fields before creating any plan]:`
    : `\n\n[ONBOARDING REQUIRED — no fitness profile exists yet]`;

  const body = missing.length > 0
    ? `\nAsk the user for these details in a friendly, conversational way (1–2 questions at a time):\n${missingList}`
    : "";

  const instruction = `
Once ALL fields are collected, include this in your JSON response block:
"profile_update": {
  "goal": "...",
  "weight_kg": 0,
  "height_cm": 0,
  "age": 0,
  "diet_type": "...",
  "activity_level": "...",
  "workout_days": 0
}
Do NOT generate a full workout or diet plan until all profile fields are known.`;

  return intro + body + instruction;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
