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
import { getDashboardHandler, logMetricsHandler, } from "../controllers/dashboard.controller.js";
const router = Router();
router.get("/dashboard/:userId", getDashboardHandler);
router.post("/progress/metrics", logMetricsHandler);
export default router;
