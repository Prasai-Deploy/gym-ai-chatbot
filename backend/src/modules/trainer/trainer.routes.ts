import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';
import {
  getTrainers,
  getTrainerDetail,
  assignMember,
  removeAssignment,
} from './trainer.controller';

export const trainerRouter = Router();

trainerRouter.use(requireAuth);
trainerRouter.use(tenantMiddleware);

// 1. Trainer Roster (Owners, Managers, and Trainers)
trainerRouter.get(
  '/',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Trainer']),
  getTrainers
);

// 2. Trainer Detail & Assignments (Owners, Managers, and Trainer inspecting self)
trainerRouter.get(
  '/:trainerUserId',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Trainer']),
  getTrainerDetail
);

// 3. Assign Member to Trainer (Owners, Managers, and Super Admin)
trainerRouter.post(
  '/assignments',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  assignMember
);

// 4. Remove / Reassign Assignment (Owners, Managers, and Super Admin)
trainerRouter.delete(
  '/assignments/:assignmentId',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  removeAssignment
);
