/**
 * services/profile.service.ts (root-level)
 * CRUD for fitness_profiles via Supabase client.
 */
import supabase from "../db.js";

export async function getProfile(userId) {
    const { data } = await supabase.from("fitness_profiles").select("*").eq("user_id", userId).maybeSingle();
    return data ?? null;
}

export async function upsertProfile(userId, data) {
    const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    if (Object.keys(filtered).length === 0) return;
    await supabase.from("fitness_profiles").upsert({ user_id: userId, ...filtered }, { onConflict: "user_id" });
}

export function isProfileComplete(profile) {
    if (!profile) return false;
    return !!(profile.goal && profile.weight_kg && profile.height_cm && profile.age && profile.diet_type && profile.activity_level && profile.workout_days);
}

export function getMissingFields(profile) {
    const checks = [
        ["goal", "Fitness goal"], ["weight_kg", "Current weight (kg)"], ["height_cm", "Height (cm)"],
        ["age", "Age"], ["diet_type", "Diet type"], ["activity_level", "Activity level"], ["workout_days", "Workout days per week"],
    ];
    if (!profile) return checks.map(([, label]) => label);
    return checks.filter(([key]) => !profile[key]).map(([, label]) => label);
}
