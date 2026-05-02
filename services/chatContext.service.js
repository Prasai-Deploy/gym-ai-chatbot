// ─────────────────────────────────────────────────────────────────────────────
// Context builder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Master function — returns the right context block for the system prompt.
 */
export function buildSystemContext(profile, legacyMemory) {
    if (!profile) {
        return "\n\n[ONBOARDING REQUIRED — no fitness profile exists yet. Redirecting user to onboarding.]";
    }
    const context = `
You are Sweatfix AI, a personal fitness coach. Always respond based on this user's profile:
- Goal: ${profile.goal || 'Not set'}
- Activity level: ${profile.activity_level || 'Not set'}
- Focus areas: ${profile.focus_areas || 'Not set'}
- Age: ${profile.age || 'N/A'}, Weight: ${profile.weight_kg || 'N/A'}kg, Height: ${profile.height_cm || 'N/A'}cm
Give specific, actionable advice tailored to this profile. Never give generic answers.`;
    if (legacyMemory) {
        return context + `\n\n[Additional Memory]:\n${legacyMemory}`;
    }
    return context;
}
function capitalize(str) {
    if (!str)
        return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
