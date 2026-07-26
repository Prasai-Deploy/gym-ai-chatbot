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

export const intelligenceRouter = router;
