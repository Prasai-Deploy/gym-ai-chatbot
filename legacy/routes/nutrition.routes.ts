/**
 * routes/nutrition.routes.ts
 */
import { Router } from "express";
import * as nutritionController from "../controllers/nutrition.controller.js";

const router = Router();

// POST /api/meal/generate → generate meal plan
router.post("/meal/generate", nutritionController.generateMealPlan);

// POST /api/nutrition/log → log food intake
router.post("/log", nutritionController.logFood);

// GET /api/nutrition/:userId → daily summary
router.get("/:userId", nutritionController.getSummary);

export default router;
