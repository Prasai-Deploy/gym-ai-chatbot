import { Router } from 'express';
import { ExerciseController } from './controllers/ExerciseController';
import { AdminExerciseController } from './controllers/AdminExerciseController';
import { ExerciseService } from './services/ExerciseService';
import { ExerciseRepository } from './repositories/ExerciseRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
// A basic requireAdmin middleware stub
const requireAdmin = requireAuth; 

const router = Router();
const adminRouter = Router();

// DI wiring
const repository = new ExerciseRepository(supabase);
const service = new ExerciseService(repository);
const controller = new ExerciseController(service);
const adminController = new AdminExerciseController(service);

// Public/Member Endpoints
router.get('/search', requireAuth, controller.searchExercises);
router.get('/categories', requireAuth, controller.getCategories);
router.get('/muscles', requireAuth, controller.getMuscleGroups);
router.get('/equipment', requireAuth, controller.getEquipment);
router.get('/:id', requireAuth, controller.getExercise);

// Admin Endpoints
adminRouter.post('/', requireAdmin, adminController.createExercise);
adminRouter.patch('/:id', requireAdmin, adminController.updateExercise);
adminRouter.delete('/:id', requireAdmin, adminController.deleteExercise);

export const exerciseRouter = router;
export const adminExerciseRouter = adminRouter;
