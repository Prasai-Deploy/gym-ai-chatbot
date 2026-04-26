/**
 * services/profile.service.ts
 * CRUD operations for the fitness_profiles table.
 */
import pool from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface FitnessProfileData {
  goal?:           string;
  weight_kg?:      number;
  height_cm?:      number;
  age?:            number;
  diet_type?:      string;
  activity_level?: string;
  workout_days?:   number;
  notes?:          string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the user's fitness profile row, or null if it doesn't exist yet. */
export async function getProfile(userId: number): Promise<any> {
  const [rows] = await pool.execute(
    "SELECT * FROM fitness_profiles WHERE user_id = ?",
    [userId]
  );
  return (rows as any[])[0] ?? null;
}

/**
 * INSERT … ON DUPLICATE KEY UPDATE so it works for both create and update.
 * Only the fields present in `data` are written — everything else is untouched.
 */
export async function upsertProfile(
  userId: number,
  data: FitnessProfileData
): Promise<void> {
  // Strip undefined values
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const fields = Object.keys(filtered);
  if (fields.length === 0) return;

  const insertCols   = ["user_id", ...fields].join(", ");
  const placeholders = ["?", ...fields.map(() => "?")].join(", ");
  const updateClause = fields.map((f) => `${f} = VALUES(${f})`).join(", ");
  const values       = [userId, ...fields.map((f) => (filtered as any)[f])];

  await pool.execute(
    `INSERT INTO fitness_profiles (${insertCols})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    values
  );
}

/**
 * Returns true only when all 7 key profile fields are filled in.
 * Used to decide between onboarding mode vs. personalized mode.
 */
export function isProfileComplete(profile: any): boolean {
  if (!profile) return false;
  return !!(
    profile.goal &&
    profile.weight_kg &&
    profile.height_cm &&
    profile.age &&
    profile.diet_type &&
    profile.activity_level &&
    profile.workout_days
  );
}

/** Returns a list of field labels that are still missing from the profile. */
export function getMissingFields(profile: any): string[] {
  const checks: Array<[keyof FitnessProfileData, string]> = [
    ["goal",           "Fitness goal (e.g., muscle gain, weight loss)"],
    ["weight_kg",      "Current weight (kg)"],
    ["height_cm",      "Height (cm)"],
    ["age",            "Age"],
    ["diet_type",      "Diet type (e.g., vegetarian, keto, no restrictions)"],
    ["activity_level", "Activity level (sedentary / lightly active / active / very active)"],
    ["workout_days",   "Workout days per week (1–7)"],
  ];
  if (!profile) return checks.map(([, label]) => label);
  return checks
    .filter(([key]) => !profile[key])
    .map(([, label]) => label);
}
