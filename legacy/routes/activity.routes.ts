import { Router, Request, Response } from "express";
import { 
  getRecentActivities, 
  markActivitiesAsRead, 
  deleteActivity 
} from "../services/activity.service.js";

const router = Router();

function requireAuth(req: Request, res: Response): number | null {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user.id;
}

router.get("/recent", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const limit = parseInt(req.query.limit as string) || 15;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const activities = await getRecentActivities(userId, limit, offset);
    res.json(activities);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/read", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    await markActivitiesAsRead(userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    await deleteActivity(userId, parseInt(req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
