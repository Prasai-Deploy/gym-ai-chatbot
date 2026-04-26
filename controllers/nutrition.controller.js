import * as nutritionService from "../services/nutrition.service.js";
export async function generateMealPlan(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: "Unauthorized" });
        const plan = await nutritionService.generateMealPlan(user.id);
        res.json(plan);
    }
    catch (err) {
        console.error("Error generating meal plan:", err);
        res.status(500).json({ error: err.message });
    }
}
export async function logFood(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: "Unauthorized" });
        const { foodText } = req.body;
        if (!foodText)
            return res.status(400).json({ error: "foodText is required" });
        const log = await nutritionService.logFoodIntake(user.id, foodText);
        res.json(log);
    }
    catch (err) {
        console.error("Error logging food:", err);
        res.status(500).json({ error: err.message });
    }
}
export async function getSummary(req, res) {
    try {
        const { userId } = req.params;
        const date = req.query.date || new Date().toISOString().split("T")[0];
        const summary = await nutritionService.getDailySummary(Number(userId), date);
        res.json(summary);
    }
    catch (err) {
        console.error("Error getting nutrition summary:", err);
        res.status(500).json({ error: err.message });
    }
}
