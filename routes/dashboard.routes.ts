/**
 * routes/dashboard.routes.ts
 * Mounts at:
 *   app.use("/api",          dashboardRouter)   → GET  /api/dashboard/:userId
 *   app.use("/api/progress", dashboardRouter)   → POST /api/progress/metrics
 *
 * We export one router used at "/api" so both prefixes resolve correctly
 * when mounted as:  app.use("/api", dashboardRouter)
 *
 *   GET  /api/dashboard/:userId
 *   POST /api/progress/metrics
 */
import { Router } from "express";
import {
  getDashboardHandler,
  logMetricsHandler,
  getLatestPlanHandler,
  getHistoryHandler,
  getProgressHandler,
  updateProgressHandler,
  saveAIPlanHandler,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/dashboard/:userId",  getDashboardHandler);
router.post("/progress/metrics",  logMetricsHandler);

// New AI Integration routes
router.get("/dashboard/latest-plan", getLatestPlanHandler);
router.get("/dashboard/history",     getHistoryHandler);
router.get("/dashboard/progress",    getProgressHandler);
router.put("/dashboard/update",      updateProgressHandler);
router.post("/chatbot/save-plan",    saveAIPlanHandler);

export default router;
