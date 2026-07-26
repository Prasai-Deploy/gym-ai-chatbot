/**
 * controllers/nutrition.controller.ts
 */
import { Request, Response } from "express";
import * as nutritionService from "../services/nutrition.service.js";

export async function generateMealPlan(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const plan = await nutritionService.generateMealPlan(user.id);
    res.json(plan);
  } catch (err: any) {
    console.error("Error generating meal plan:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function logFood(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { foodText } = req.body;
    if (!foodText) return res.status(400).json({ error: "foodText is required" });

    const log = await nutritionService.logFoodIntake(user.id, foodText);
    res.json(log);
  } catch (err: any) {
    console.error("Error logging food:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getSummary(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const summary = await nutritionService.getDailySummary(Number(userId), date);
    res.json(summary);
  } catch (err: any) {
    console.error("Error getting nutrition summary:", err);
    res.status(500).json({ error: err.message });
  }
}
