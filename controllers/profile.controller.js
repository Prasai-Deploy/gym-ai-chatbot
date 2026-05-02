import { getProfile, upsertProfile, isProfileComplete, } from "../services/profile.service.js";
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
export async function getProfileHandler(req, res) {
    const user = req.user;
    const requestedId = req.params.userId;
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    // Support both numeric and string IDs for comparison
    if (user.id.toString() !== requestedId.toString()) {
        res.status(403).json({ error: "Forbidden — you can only access your own profile" });
        return;
    }
    try {
        const profile = await getProfile(requestedId);
        if (!profile) {
            res.status(404).json({ profile: null, hasProfile: false, isComplete: false });
            return;
        }
        res.json({
            profile,
            hasProfile: true,
            isComplete: isProfileComplete(profile),
        });
    }
    catch (e) {
        console.error("[Profile] GET error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/profile  (create or update)
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertProfileHandler(req, res) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { goal, gender, age, weight_kg, height_cm, activity_level, focus_areas, } = req.body;
    try {
        await upsertProfile(user.id, {
            goal,
            gender,
            age,
            weight_kg,
            height_cm,
            activity_level,
            focus_areas,
        });
        const profile = await getProfile(user.id);
        res.json({
            success: true,
            profile,
            isComplete: isProfileComplete(profile),
        });
    }
    catch (e) {
        console.error("[Profile] POST error:", e.message);
        res.status(500).json({ error: e.message });
    }
}
