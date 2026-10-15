import { Router } from 'express';
import { ProgressController } from './controllers/ProgressController';
import { ProgressAnalyticsService } from './services/ProgressAnalyticsService';
import { AchievementService } from './services/AchievementService';
import { ProgressRepository } from './repositories/ProgressRepository';
import { AchievementRepository } from './repositories/AchievementRepository';
import { WorkoutEventSubscriber } from './subscribers/WorkoutEventSubscriber';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { requireActiveEntitlement } from '@middleware/entitlement.middleware';

const router = Router();

// DI wiring
const progressRepository = new ProgressRepository(supabaseAdmin);
const achievementRepository = new AchievementRepository(supabaseAdmin);

const analyticsService = new ProgressAnalyticsService(progressRepository);
const achievementService = new AchievementService(achievementRepository);

const controller = new ProgressController(analyticsService, achievementService);

// Subscribe to EventBus
const eventSubscriber = new WorkoutEventSubscriber(analyticsService, achievementService);
eventSubscriber.subscribe();

// -- ROUTES --
router.use(requireAuth);
router.use(requireActiveEntitlement({ feature: 'progress' }));

router.get('/statistics', controller.getStatistics);
router.get('/summary', requireAuth, controller.getStatistics);
router.get('/snapshots', requireAuth, controller.getSnapshots);
router.get('/history', requireAuth, controller.getHistory);
router.get('/achievements', requireAuth, controller.getAchievements);

export const progressRouter = router;
