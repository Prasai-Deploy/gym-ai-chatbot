import { Router } from 'express';
import { AdminController } from './controllers/AdminController';
import { AdminService } from './services/AdminService';
import { AdminRepository } from './repositories/AdminRepository';
import { supabaseAdmin } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const router = Router();

/**
 * Admin routes use supabaseAdmin (service role) to bypass RLS.
 * Auth is still required — requireAuth validates the JWT and attaches req.user.
 * TODO: Replace requireAuth with a proper requireAdmin middleware that checks
 * an admin role claim in the JWT or an admins table.
 */

// DI Wiring
const repository = new AdminRepository(supabaseAdmin);
const service = new AdminService(repository);
const controller = new AdminController(service);

// -- ADMIN ROUTES --
// These match the endpoints called by src/api/adminApi.ts
router.get('/dashboard-data', requireAuth, controller.getDashboardData);
router.get('/members', requireAuth, controller.getMembers);
router.get('/plans', requireAuth, controller.getPlans);
router.get('/membership-plans', requireAuth, controller.getMembershipPlans);
router.post('/assign-plan', requireAuth, controller.assignPlan);

export const adminRouter = router;
