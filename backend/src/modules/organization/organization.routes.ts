import { Router } from 'express';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { getOrganizationDetails, getOrganizationBranding } from './organization.controller';

export const organizationRouter = Router();

organizationRouter.use(tenantMiddleware);

organizationRouter.get('/current', getOrganizationDetails);
organizationRouter.get('/branding', getOrganizationBranding);
