import { Request, Response, Router } from 'express';

const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', (_req: Request, res: Response) => {
  // In the future, this should ping the database to ensure connection is alive
  res.status(200).json({ status: 'READY', timestamp: new Date().toISOString() });
});

export { healthRouter };
