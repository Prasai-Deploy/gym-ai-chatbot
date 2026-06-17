import { Router } from "express";
import { getWeeklyChartHandler, getWeeklySummaryHandler, getDailyStatsHandler, logManualProgressHandler } from "../controllers/progress.controller.js";
const router = Router();
router.get("/weekly", getWeeklyChartHandler);
router.get("/chart-data", getWeeklyChartHandler); // Alias for graph
router.get("/summary", getWeeklySummaryHandler);
router.get("/daily", getDailyStatsHandler);
router.post("/", logManualProgressHandler);
export default router;
