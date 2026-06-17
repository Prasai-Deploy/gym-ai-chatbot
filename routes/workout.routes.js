/**
 * routes/workout.routes.ts
 * Mounts at: app.use("/api/workout", workoutRouter)
 *
 *   POST /api/workout/generate      → generate today's workout plan
 *   GET  /api/workout/:userId       → fetch latest plan for a user
 *   POST /api/workout/log           → save completed exercise logs
 */
import { Router } from "express";
import { generateWorkoutHandler, getWorkoutHandler, logWorkoutHandler, getTodayWorkoutHandler, startWorkoutHandler, updateProgressHandler, completeWorkoutHandler, getHistoryHandler, } from "../controllers/workout.controller.js";
const router = Router();
// Order matters: static subroutes must come before /:userId
router.post("/generate", generateWorkoutHandler);
router.post("/log", logWorkoutHandler);
router.get("/today", getTodayWorkoutHandler);
router.post("/start", startWorkoutHandler);
router.post("/progress", updateProgressHandler);
router.post("/complete", completeWorkoutHandler);
router.get("/history", getHistoryHandler);
router.get("/:userId", getWorkoutHandler);
export default router;
