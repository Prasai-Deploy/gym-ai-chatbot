import { Request, Response, NextFunction } from 'express';

export interface OrganizationContext {
  organizationId: string;
  locationId?: string;
  roleKey?: string;
}

declare global {
  namespace Express {
    interface Request {
      organizationContext?: OrganizationContext;
    }
  }
}

export const tenantMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const orgHeader = req.headers['x-organization-id'] as string;
    const locationHeader = req.headers['x-location-id'] as string;

    const organizationId = orgHeader || '00000000-0000-0000-0000-000000000001';
    const locationId = locationHeader || '00000000-0000-0000-0000-000000000002';

    req.organizationContext = {
      organizationId,
      locationId,
      roleKey: (req as any).user?.role || 'Member',
    };

    next();
  } catch (error) {
    next(error);
  }
};
