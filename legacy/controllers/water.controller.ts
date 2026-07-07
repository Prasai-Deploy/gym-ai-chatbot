import { Request, Response } from "express";
import {
  addWaterIntake,
  updateWaterIntake,
  deleteWaterIntake,
  getTodayHydration,
  getTodayLogs,
  getHydrationHistory,
  setHydrationGoal
} from "../services/water.service.js";

function requireAuth(req: Request, res: Response): number | null {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user.id;
}

export async function addWaterHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { amount, source } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: "Invalid amount" });

  try {
    await addWaterIntake(userId, amount, source);
    const summary = await getTodayHydration(userId);
    res.json({ success: true, summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateWaterHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { id, amount } = req.body;
  try {
    await updateWaterIntake(userId, id, amount);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteWaterHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { id } = req.params;
  try {
    await deleteWaterIntake(userId, parseInt(id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getTodayWaterHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const summary = await getTodayHydration(userId);
    const logs = await getTodayLogs(userId);
    res.json({ summary, logs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getWaterHistoryHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const history = await getHydrationHistory(userId);
    res.json(history);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function setWaterGoalHandler(req: Request, res: Response) {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { goal, isAI, reason } = req.body;
  try {
    await setHydrationGoal(userId, goal, isAI, reason);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
