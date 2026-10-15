import { Router } from 'express';
import { notificationController } from './notification.controller';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';

export const orgNotificationRouter = Router();

// Enforce authentication & verified tenant context on all routes
orgNotificationRouter.use(requireAuth);
orgNotificationRouter.use(tenantMiddleware);

// Attention summary for owner & manager dashboard
orgNotificationRouter.get(
  '/attention',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  notificationController.getAttentionSummary
);

// Unread notifications count
orgNotificationRouter.get(
  '/unread-count',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer', 'Nutritionist']),
  notificationController.getUnreadCount
);

// Mark all unread notifications as read
orgNotificationRouter.post(
  '/mark-all-read',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer', 'Nutritionist']),
  notificationController.markAllAsRead
);

// Mark single notification as read
orgNotificationRouter.patch(
  '/:id/read',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer', 'Nutritionist']),
  notificationController.markAsRead
);

// List authorized notifications
orgNotificationRouter.get(
  '/',
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer', 'Nutritionist']),
  notificationController.listNotifications
);
