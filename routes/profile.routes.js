/**
 * routes/profile.routes.ts
 * Mounts at: app.use("/api/profile", profileRouter)
 *
 *   GET  /api/profile/:userId  → fetch profile
 *   POST /api/profile          → create / update profile
 */
import { Router } from "express";
import { getProfileHandler, upsertProfileHandler, } from "../controllers/profile.controller.js";
const router = Router();
router.get("/:userId", getProfileHandler);
router.post("/", upsertProfileHandler);
export default router;
