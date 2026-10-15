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
 * Authentication (requireAuth), Tenant Resolution (tenantMiddleware), and Admin Authorization (requireAdmin)
 * are enforced before any controller method executes.
 */

// DI Wiring
const repository = new AdminRepository(supabaseAdmin);
const service = new AdminService(repository);
const controller = new AdminController(service);

// -- ADMIN ROUTES --
// Enforce Authentication -> Tenant Context -> Admin Authorization -> Controller Execution
router.get('/dashboard-data', requireAuth, tenantMiddleware, requireAdmin, controller.getDashboardData);
router.get('/members', requireAuth, tenantMiddleware, requireAdmin, controller.getMembers);
router.get('/plans', requireAuth, tenantMiddleware, requireAdmin, controller.getPlans);
router.get('/membership-plans', requireAuth, tenantMiddleware, requireAdmin, controller.getMembershipPlans);
router.post('/assign-plan', requireAuth, tenantMiddleware, requireAdmin, controller.assignPlan);


export const adminRouter = router;

