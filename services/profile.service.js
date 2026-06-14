/**
 * services/profile.service.ts
 * CRUD operations for the fitness_profiles table via Supabase client.
 */
import supabase from "../db.js";

/** Returns the user's fitness profile row, or null if it doesn't exist yet. */
export async function getProfile(userId) {
    const { data } = await supabase
        .from("fitness_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    return data ?? null;
}

/**
 * Upsert via Supabase — inserts if new, updates if user_id already exists.
 * Only the fields present in `data` are written.
 */
export async function upsertProfile(userId, data) {
    const filtered = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    if (Object.keys(filtered).length === 0) return;

    await supabase
        .from("fitness_profiles")
        .upsert({ user_id: userId, ...filtered }, { onConflict: "user_id" });
}

/**
 * Returns true only when all 7 key profile fields are filled in.
 */
export function isProfileComplete(profile) {
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
export function getMissingFields(profile) {
    const checks = [
        ["goal", "Fitness goal (e.g., muscle gain, weight loss)"],
        ["weight_kg", "Current weight (kg)"],
        ["height_cm", "Height (cm)"],
        ["age", "Age"],
        ["diet_type", "Diet type (e.g., vegetarian, keto, no restrictions)"],
        ["activity_level", "Activity level (sedentary / lightly active / active / very active)"],
        ["workout_days", "Workout days per week (1–7)"],
    ];
    if (!profile) return checks.map(([, label]) => label);
    return checks.filter(([key]) => !profile[key]).map(([, label]) => label);
}
