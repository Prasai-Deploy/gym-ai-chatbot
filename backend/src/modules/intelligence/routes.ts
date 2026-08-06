import { Router } from 'express';
import { IntelligenceController } from './controllers/IntelligenceController';
import { ContextBuilderService } from './services/ContextBuilderService';
import { RecommendationService } from './services/RecommendationService';
import { NutritionService } from './services/NutritionService';
import { RecoveryService } from './services/RecoveryService';
import { MemoryService } from './services/MemoryService';
import { NutritionRepository } from './repositories/NutritionRepository';
import { RecoveryRepository } from './repositories/RecoveryRepository';
import { MemoryRepository } from './repositories/MemoryRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const router = Router();

// DI Wiring
const nutritionRepo = new NutritionRepository(supabase);
const recoveryRepo = new RecoveryRepository(supabase);
const memoryRepo = new MemoryRepository(supabase);

const nutritionSvc = new NutritionService(nutritionRepo);
const recoverySvc = new RecoveryService(recoveryRepo);
const memorySvc = new MemoryService(memoryRepo);
const recommendationSvc = new RecommendationService();

// Mocking external services for the context builder slice
const extProgress = { getStats: async () => ({ workout_count: 5, current_streak: 2, lifetime_volume_kg: 5000 }) };
const extIdentity = { getProfile: async () => ({ name: 'Test User' }) };

const contextBuilder = new ContextBuilderService(
  nutritionSvc,
  recoverySvc,
  memorySvc,
  extProgress as any,
  extIdentity as any
);

const controller = new IntelligenceController(
  contextBuilder,
  recommendationSvc,
  nutritionSvc,
  recoverySvc,
  memorySvc
);

// -- ROUTES --
router.get('/context', requireAuth, controller.getContext);
router.get('/recommendations', requireAuth, controller.getRecommendations);
router.post('/nutrition/log', requireAuth, controller.logNutrition);
router.post('/recovery/log', requireAuth, controller.logRecovery);
router.post('/memory', requireAuth, controller.setMemory);

// Sprint 4C — Predictive Intelligence Engine
import { predictionEngine } from './prediction/PredictionEngine';
import { HealthMetrics } from './prediction/prediction.types';
import { BusinessMetrics } from './prediction/BusinessForecastEngine';

router.post('/predict/member', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const metrics: HealthMetrics = { userId, ...req.body.metrics };
    const goals = req.body.goals;
    const report = await predictionEngine.generateMemberReport(metrics, goals);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

router.post('/predict/business', requireAuth, async (req, res, next) => {
  try {
    const bizMetrics: BusinessMetrics = req.body;
    const report = await predictionEngine.generateBusinessReport(bizMetrics);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

router.post('/predict/scenario', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { metrics, scenarios } = req.body;
    const results = predictionEngine.runScenario({ userId, ...metrics }, scenarios);
    res.json({ success: true, data: { scenarios: results } });
  } catch (err) { next(err); }
});

router.post('/health-score', requireAuth, async (req, res, next) => {
  try {
    const { healthScoreEngine } = await import('./prediction/HealthScoreEngine');
    const userId = (req as any).user.id;
    const score = healthScoreEngine.calculate({ userId, ...req.body });
    res.json({ success: true, data: score });
  } catch (err) { next(err); }
});

router.post('/insights', requireAuth, async (req, res, next) => {
  try {
    const { insightEngine } = await import('./prediction/InsightEngine');
    const { healthScoreEngine } = await import('./prediction/HealthScoreEngine');
    const { workoutPredictionEngine } = await import('./prediction/WorkoutPredictionEngine');
    const { recoveryPredictionEngine } = await import('./prediction/RecoveryPredictionEngine');
    const userId = (req as any).user.id;
    const metrics: HealthMetrics = { userId, ...req.body };
    const hs = healthScoreEngine.calculate(metrics);
    const wp = workoutPredictionEngine.predict(metrics);
    const rp = recoveryPredictionEngine.predict(metrics);
    const feed = insightEngine.generateFeed(userId, metrics, hs, wp, rp);
    res.json({ success: true, data: { insights: feed } });
  } catch (err) { next(err); }
});

export const intelligenceRouter = router;

