import { Router } from 'express';
import { AdminController } from './controllers/AdminController';
import { AdminService } from './services/AdminService';
import { AdminRepository } from './repositories/AdminRepository';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth, requireAdmin } from '@middleware/auth.middleware';
import { tenantMiddleware } from '@middleware/tenant.middleware';

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
router.use(requireAuth, tenantMiddleware, requireAdmin);
router.get('/dashboard-data', controller.getDashboardData);
router.get('/members', controller.getMembers);
router.get('/plans', controller.getPlans);
router.get('/membership-plans', controller.getMembershipPlans);
router.post('/assign-plan', controller.assignPlan);

export const adminRouter = router;
