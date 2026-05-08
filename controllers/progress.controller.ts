import { Request, Response } from "express";
import * as ProgressService from "../services/progress.service.js";

function getUserId(req: Request): number | null {
  return (req as any).user?.id || null;
}

export async function getWeeklyChartHandler(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = await ProgressService.getWeeklyChartData(userId);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getWeeklySummaryHandler(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const summary = await ProgressService.getWeeklySummary(userId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getDailyStatsHandler(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const stats = await ProgressService.getDailyStats(userId);
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function logManualProgressHandler(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await ProgressService.logManualProgress(userId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
