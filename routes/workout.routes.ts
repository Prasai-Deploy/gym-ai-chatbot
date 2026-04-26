/**
 * routes/workout.routes.ts
 * Mounts at: app.use("/api/workout", workoutRouter)
 *
 *   POST /api/workout/generate      → generate today's workout plan
 *   GET  /api/workout/:userId       → fetch latest plan for a user
 *   POST /api/workout/log           → save completed exercise logs
 */
import { Router } from "express";
import {
  generateWorkoutHandler,
  getWorkoutHandler,
  logWorkoutHandler,
} from "../controllers/workout.controller.js";

const router = Router();

// Order matters: /generate and /log must come before /:userId
// so Express does not treat "generate" or "log" as a userId param.
router.post("/generate", generateWorkoutHandler);
router.post("/log",      logWorkoutHandler);
router.get("/:userId",   getWorkoutHandler);

export default router;
