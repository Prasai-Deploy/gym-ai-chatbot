import { Router } from 'express';
import { WorkoutController } from './controllers/WorkoutController';
import { AdminWorkoutController } from './controllers/AdminWorkoutController';
import { WorkoutExecutionService } from './services/WorkoutExecutionService';
import { WorkoutProgramService } from './services/WorkoutProgramService';
import { V2WorkoutSessionRepository } from './repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository } from './repositories/WorkoutPlanRepository';
import { WorkoutProgramRepository } from './repositories/WorkoutProgramRepository';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { requireActiveEntitlement } from '@middleware/entitlement.middleware';

const requireAdmin = requireAuth;

const router = Router();
const adminRouter = Router();

// DI wiring
const sessionRepository = new V2WorkoutSessionRepository(supabaseAdmin);
const planRepository = new WorkoutPlanRepository(supabaseAdmin);
const programRepository = new WorkoutProgramRepository(supabaseAdmin);

const executionService = new WorkoutExecutionService(sessionRepository, planRepository);
const programService = new WorkoutProgramService(programRepository);

const controller = new WorkoutController(executionService);
const adminController = new AdminWorkoutController(programService);

// -- MEMBER PLAN ROUTES --
router.get('/plans', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.getPlans);
router.get('/plans/:id', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.getPlanById);
router.post('/plans', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.createPlan);
router.patch('/plans/:id', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.updatePlan);

// -- MEMBER EXECUTION ROUTES --
router.get('/today', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.getToday);
router.post('/sessions/start', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.startSession);
router.get('/sessions/active', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.getActiveSession);
router.get('/sessions/:id', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.getSession);
router.post('/sessions/:id/transition', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.transitionState);
router.post('/sessions/:id/complete', requireAuth, requireActiveEntitlement({ feature: 'workouts' }), controller.completeSession);
router.post('/sets', requireAuth, controller.logSet);
router.patch('/sets/:setId', requireAuth, controller.completeSet);
router.get('/history', requireAuth, controller.getHistory);

// Legacy / Program Discovery
router.get('/programs', requireAuth, adminController.getPublishedPrograms);

// -- ADMIN ROUTES --
adminRouter.post('/programs', requireAdmin, adminController.createProgram);
adminRouter.post('/programs/:programId/versions/:versionId/publish', requireAdmin, adminController.publishVersion);

export const workoutRouter = router;
export const adminWorkoutRouter = adminRouter;
