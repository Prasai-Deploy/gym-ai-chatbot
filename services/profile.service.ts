/**
 * services/profile.service.ts
 * CRUD operations for the user_profiles table.
 */
import pool from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface FitnessProfileData {
  goal?:           string;
  gender?:         string;
  age?:            number;
  weight_kg?:      number;
  height_cm?:      number;
  activity_level?: string;
  focus_areas?:    string; // comma-separated string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the user's profile row, or null if it doesn't exist yet. */
export async function getProfile(userId: string | number): Promise<any> {
  const [rows] = await pool.execute(
    "SELECT * FROM user_profiles WHERE user_id = ?",
    [userId.toString()]
  );
  return (rows as any[])[0] ?? null;
}

/**
 * INSERT … ON DUPLICATE KEY UPDATE so it works for both create and update.
 */
export async function upsertProfile(
  userId: string | number,
  data: FitnessProfileData
): Promise<void> {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const fields = Object.keys(filtered);
  if (fields.length === 0) return;

  const insertCols   = ["user_id", ...fields].join(", ");
  const placeholders = ["?", ...fields.map(() => "?")].join(", ");
  const updateClause = fields.map((f) => `${f} = VALUES(${f})`).join(", ");
  const values       = [userId.toString(), ...fields.map((f) => (filtered as any)[f])];

  await pool.execute(
    `INSERT INTO user_profiles (${insertCols})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    values
  );
}

/**
 * Returns true only when all key profile fields are filled in.
 */
export function isProfileComplete(profile: any): boolean {
  if (!profile) return false;
  return !!(
    profile.goal &&
    profile.gender &&
    profile.age &&
    profile.weight_kg &&
    profile.height_cm &&
    profile.activity_level &&
    profile.focus_areas
  );
}

/** Returns a list of field labels that are still missing from the profile. */
export function getMissingFields(profile: any): string[] {
  const checks: Array<[keyof FitnessProfileData, string]> = [
    ["goal",           "Fitness goal"],
    ["gender",         "Gender"],
    ["age",            "Age"],
    ["weight_kg",      "Weight (kg)"],
    ["height_cm",      "Height (cm)"],
    ["activity_level", "Activity level"],
    ["focus_areas",    "Focus areas"],
  ];
  if (!profile) return checks.map(([, label]) => label);
  return checks
    .filter(([key]) => !profile[key])
    .map(([, label]) => label);
}
