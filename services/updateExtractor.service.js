// ─────────────────────────────────────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHT_RE = /(?:my weight(?:\s+is)?(?:\s+now)?|i(?:'m| am| now weigh(?:ing)?| weigh(?:ing)?)?)\s*(?:is\s+)?(?:now\s+)?(\d+(?:\.\d+)?)\s*(?:kg|kgs?|kilograms?)/i;
const HEIGHT_RE = /(?:my height(?:\s+is)?(?:\s+now)?|i(?:'m| am)?\s*(?:now\s+)?(?:stand|am|'m)\s*(?:tall\s*)?at\s+)?(\d+(?:\.\d+)?)\s*(?:cm|centimetres?|centimeters?)/i;
const AGE_RE = /(?:i(?:'m| am)\s+(?:now\s+)?|my age(?:\s+is)?(?:\s+now)?\s*)(\d{1,2})\s*(?:years?\s*old|yrs?\.?\s*old|yo\b)/i;
const WORKOUT_DAYS_RE = /(?:i(?:\s+now)?\s+(?:work\s*out|exercise|train)\s+|workout?\s+)(\d)\s*days?(?:\s*(?:a|per)\s*week|\s*\/\s*week)?/i;
// ─────────────────────────────────────────────────────────────────────────────
// Keyword maps
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_MAP = [
    ["muscle gain", "muscle gain"],
    ["build muscle", "muscle gain"],
    ["bulk", "muscle gain"],
    ["bulking", "muscle gain"],
    ["weight loss", "weight loss"],
    ["lose weight", "weight loss"],
    ["fat loss", "weight loss"],
    ["cut ", "weight loss"],
    ["cutting", "weight loss"],
    ["endurance", "endurance"],
    ["cardio", "endurance"],
    ["strength", "strength training"],
    ["powerlifting", "powerlifting"],
    ["general fitness", "general fitness"],
    ["stay fit", "general fitness"],
    ["stay healthy", "general fitness"],
    ["flexibility", "flexibility"],
    ["stamina", "stamina"],
];
const DIET_MAP = [
    ["vegetarian", "vegetarian"],
    ["vegan", "vegan"],
    ["keto", "keto"],
    ["paleo", "paleo"],
    ["halal", "halal"],
    ["gluten-free", "gluten-free"],
    ["gluten free", "gluten-free"],
    ["no restriction", "no restrictions"],
    ["eat everything", "no restrictions"],
    ["omnivore", "no restrictions"],
];
const ACTIVITY_MAP = [
    ["sedentary", "sedentary"],
    ["not very active", "sedentary"],
    ["lightly active", "lightly active"],
    ["light active", "lightly active"],
    ["moderately active", "active"],
    ["fairly active", "active"],
    [" active", "active"], // fallback — checked last
    ["very active", "very active"],
    ["extremely active", "very active"],
    ["highly active", "very active"],
];
// ─────────────────────────────────────────────────────────────────────────────
// Extractor
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Scans a user message for any recognisable profile-field updates.
 * Returns only the fields found (empty object = nothing to update).
 */
export function extractProfileUpdate(message) {
    const update = {};
    const lower = message.toLowerCase();
    // Numeric fields via regex
    const weightMatch = message.match(WEIGHT_RE);
    if (weightMatch)
        update.weight_kg = parseFloat(weightMatch[1]);
    const heightMatch = message.match(HEIGHT_RE);
    if (heightMatch)
        update.height_cm = parseFloat(heightMatch[1]);
    const ageMatch = message.match(AGE_RE);
    if (ageMatch)
        update.age = parseInt(ageMatch[1], 10);
    const workoutMatch = message.match(WORKOUT_DAYS_RE);
    if (workoutMatch)
        update.workout_days = parseInt(workoutMatch[1], 10);
    // Keyword maps
    for (const [kw, val] of GOAL_MAP) {
        if (lower.includes(kw)) {
            update.goal = val;
            break;
        }
    }
    for (const [kw, val] of DIET_MAP) {
        if (lower.includes(kw)) {
            update.diet_type = val;
            break;
        }
    }
    for (const [kw, val] of ACTIVITY_MAP) {
        if (lower.includes(kw)) {
            update.activity_level = val;
            break;
        }
    }
    return update;
}
