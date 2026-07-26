import { Router } from 'express';
import { WorkoutController } from './controllers/WorkoutController';
import { AdminWorkoutController } from './controllers/AdminWorkoutController';
import { WorkoutExecutionService } from './services/WorkoutExecutionService';
import { WorkoutProgramService } from './services/WorkoutProgramService';
import { LegacyWorkoutSessionRepository } from './repositories/LegacyWorkoutSessionRepository';
import { WorkoutProgramRepository } from './repositories/WorkoutProgramRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const requireAdmin = requireAuth; // Stub

const router = Router();
const adminRouter = Router();

// DI wiring
const sessionRepository = new LegacyWorkoutSessionRepository(supabase);
const programRepository = new WorkoutProgramRepository(supabase);

const executionService = new WorkoutExecutionService(sessionRepository);
const programService = new WorkoutProgramService(programRepository);

const controller = new WorkoutController(executionService);
const adminController = new AdminWorkoutController(programService);

// -- MEMBER ROUTES --
router.get('/sessions/:id', requireAuth, controller.getSession);
router.post('/sessions/:id/transition', requireAuth, controller.transitionState);
router.patch('/sets/:setId', requireAuth, controller.completeSet);

// Public planning routes
router.get('/programs', requireAuth, adminController.getPublishedPrograms);

// -- ADMIN ROUTES --
adminRouter.post('/programs', requireAdmin, adminController.createProgram);
adminRouter.post('/programs/:programId/versions/:versionId/publish', requireAdmin, adminController.publishVersion);

export const workoutRouter = router;
export const adminWorkoutRouter = adminRouter;
