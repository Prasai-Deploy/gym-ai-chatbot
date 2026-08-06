import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';

const service = new OrganizationService();

export const getOrganizationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId || '00000000-0000-0000-0000-000000000001';
    const details = await service.getOrganizationDetails(orgId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationBranding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId || '00000000-0000-0000-0000-000000000001';
    const details = await service.getOrganizationDetails(orgId);

    res.json({
      success: true,
      data: details.branding || {
        business_name: 'STRIVA Fitness Engine',
        primary_color: '#F97316',
        secondary_color: '#6366F1',
        theme_mode: 'dark',
        currency: 'USD',
        country: 'USA',
        timezone: 'UTC',
      },
    });
  } catch (error) {
    next(error);
  }
};
