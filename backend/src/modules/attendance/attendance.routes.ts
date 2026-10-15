import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';
import { checkIn, checkOut, getTodayAttendance, getHistory, searchMembers } from './attendance.controller';

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.use(tenantMiddleware);

// Operations
attendanceRouter.post('/checkin', checkIn);
attendanceRouter.post('/checkout', checkOut);

// Search members for attendance check-in
attendanceRouter.get(
  '/members/search',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer']),
  searchMembers
);

// Owner / Front Desk Operational Overview
attendanceRouter.get(
  '/today',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer']),
  getTodayAttendance
);

// Attendance History (scoped by role inside controller)
attendanceRouter.get('/history', getHistory);


