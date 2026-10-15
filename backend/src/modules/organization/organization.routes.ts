import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';
import {
  listOrganizations,
  getOrganizationDetails,
  getOrganizationOverview,
  getOrganizationById,
  getOrganizationLocations,
  getOrganizationMembers,
  getOrganizationMemberDetail,
  getOrganizationBranding,
  getOrganizationStaff,
  inviteStaff,
  acceptInvitation,
  updateMemberRole,
} from './organization.controller';
import { orgBillingRouter } from '../billing/organization/orgBilling.routes';
import { orgNotificationRouter } from '../notification/notification.routes';
import { orgAdvisorRouter } from '../ai/advisor/orgAdvisor.routes';

export const organizationRouter = Router();

// Organization B2B Billing Sub-router
organizationRouter.use('/current/billing', orgBillingRouter);

// Organization In-App Notifications & Attention Sub-router (Phase 8I)
organizationRouter.use('/current/notifications', orgNotificationRouter);

// Organization B2B TRINETRA AI Advisor Sub-router (Phase 8J)
organizationRouter.use('/current/advisor', orgAdvisorRouter);

organizationRouter.use(requireAuth);

organizationRouter.get('/', listOrganizations);
organizationRouter.get('/current', tenantMiddleware, getOrganizationDetails);
organizationRouter.get(
  '/current/overview',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  getOrganizationOverview
);
organizationRouter.get(
  '/current/members',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  getOrganizationMembers
);
organizationRouter.get(
  '/current/members/:memberId',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  getOrganizationMemberDetail
);
organizationRouter.get('/branding', tenantMiddleware, getOrganizationBranding);
organizationRouter.get(
  '/current/staff',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer', 'Nutritionist']),
  getOrganizationStaff
);
organizationRouter.post(
  '/current/invitations',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  inviteStaff
);
organizationRouter.post('/invitations/accept', acceptInvitation);
organizationRouter.patch(
  '/current/members/:userId/role',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner']),
  updateMemberRole
);
organizationRouter.get('/:id', getOrganizationById);
organizationRouter.get('/:id/locations', getOrganizationLocations);
organizationRouter.get(
  '/:id/members',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  getOrganizationMembers
);
organizationRouter.get(
  '/:id/members/:memberId',
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  getOrganizationMemberDetail
);

