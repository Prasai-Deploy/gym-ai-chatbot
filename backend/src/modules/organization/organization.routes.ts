import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { getOrganizationDetails, getOrganizationBranding } from './organization.controller';

export const organizationRouter = Router();

organizationRouter.use(requireAuth, tenantMiddleware);

organizationRouter.get('/current', getOrganizationDetails);
organizationRouter.get('/branding', getOrganizationBranding);
