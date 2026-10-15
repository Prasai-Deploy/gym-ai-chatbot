import { Router } from 'express';
import { NutritionController } from './controllers/NutritionController';
import { NutritionService } from './services/NutritionService';
import { NutritionRepository } from './repositories/NutritionRepository';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { requireActiveEntitlement } from '@middleware/entitlement.middleware';

const router = Router();

// DI wiring
const repository = new NutritionRepository(supabaseAdmin);
const service = new NutritionService(repository);
const controller = new NutritionController(service);

// Express Routes under /api/v1/nutrition
router.use(requireAuth);
router.use(requireActiveEntitlement({ feature: 'nutrition' }));

router.get('/daily', controller.getDaily);
router.post('/meals', controller.createMeal);
router.patch('/meals/:id', controller.updateMeal);
router.delete('/meals/:id', controller.deleteMeal);

router.get('/water', controller.getWater);
router.post('/water', controller.addWater);
router.delete('/water/:id', controller.deleteWater);

export const nutritionRouter = router;
