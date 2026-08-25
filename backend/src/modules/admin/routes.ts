import { Router } from 'express';
import { AdminController } from './controllers/AdminController';
import { AdminService } from './services/AdminService';
import { AdminRepository } from './repositories/AdminRepository';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth, requireAdmin } from '@middleware/auth.middleware';

const router = Router();

/**
 * Admin routes use supabaseAdmin (service role) for administrative data access.
 * Authentication (requireAuth) and Administrative RBAC Authorization (requireAdmin)
 * are enforced before any controller method executes.
 */

// DI Wiring
const repository = new AdminRepository(supabaseAdmin);
const service = new AdminService(repository);
const controller = new AdminController(service);

// -- ADMIN ROUTES --
// Enforce Authentication -> Tenant Context -> Admin Authorization -> Controller Execution
router.get('/dashboard-data', requireAuth, requireAdmin, controller.getDashboardData);
router.get('/members', requireAuth, requireAdmin, controller.getMembers);
router.get('/plans', requireAuth, requireAdmin, controller.getPlans);
router.get('/membership-plans', requireAuth, requireAdmin, controller.getMembershipPlans);
router.post('/assign-plan', requireAuth, requireAdmin, controller.assignPlan);

export const adminRouter = router;

