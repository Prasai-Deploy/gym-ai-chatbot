import { Router } from 'express';
import { ProgressController } from './controllers/ProgressController';
import { ProgressAnalyticsService } from './services/ProgressAnalyticsService';
import { AchievementService } from './services/AchievementService';
import { ProgressRepository } from './repositories/ProgressRepository';
import { AchievementRepository } from './repositories/AchievementRepository';
import { WorkoutEventSubscriber } from './subscribers/WorkoutEventSubscriber';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const router = Router();

// DI wiring
const progressRepository = new ProgressRepository(supabase);
const achievementRepository = new AchievementRepository(supabase);

const analyticsService = new ProgressAnalyticsService(progressRepository);
const achievementService = new AchievementService(achievementRepository);

const controller = new ProgressController(analyticsService, achievementService);

// Subscribe to EventBus
const eventSubscriber = new WorkoutEventSubscriber(analyticsService, achievementService);
eventSubscriber.subscribe();

// -- ROUTES --
router.get('/statistics', requireAuth, controller.getStatistics);
router.get('/achievements', requireAuth, controller.getAchievements);

export const progressRouter = router;
