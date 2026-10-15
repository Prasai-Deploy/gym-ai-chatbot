import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';
import { ForbiddenError, NotFoundError } from '@errors/AppError';

const service = new OrganizationService();

export const getOrganizationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

    const details = await service.getOrganizationDetails(orgId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

    const overview = await service.getOverview(orgId);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const listOrganizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ForbiddenError('Authenticated context required');
    }

    const orgs = await service.listUserOrganizations(userId);
    res.json({
      success: true,
      data: orgs,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = req.params.id || req.organizationContext?.organizationId;
    if (!orgId || !userId) {
      throw new ForbiddenError('Organization ID and authentication required');
    }

    const isMember = await service.isMember(orgId, userId);
    if (!isMember) {
      throw new ForbiddenError('Access denied: You are not a member of this organization');
    }

    const details = await service.getOrganizationDetails(orgId);
    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = req.params.id || req.organizationContext?.organizationId;
    if (!orgId || !userId) {
      throw new ForbiddenError('Organization ID and authentication required');
    }

    const isMember = await service.isMember(orgId, userId);
    if (!isMember) {
      throw new ForbiddenError('Access denied: You are not a member of this organization');
    }

    const locations = await service.getLocations(orgId);
    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantOrgId = req.organizationContext?.organizationId;
    const isSuperAdmin = req.organizationContext?.roleKey === 'Platform Super Admin';
    const requestedOrgId = req.params.id;

    const orgId = requestedOrgId && requestedOrgId !== 'current' && isSuperAdmin
      ? requestedOrgId
      : tenantOrgId;

    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

    if (requestedOrgId && requestedOrgId !== 'current' && !isSuperAdmin && requestedOrgId !== tenantOrgId) {
      throw new ForbiddenError('Access denied: You are not authorized to view members of another organization');
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;

    const result = await service.getPaginatedMembers(orgId, { page, limit, search, status, role });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationMemberDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantOrgId = req.organizationContext?.organizationId;
    const isSuperAdmin = req.organizationContext?.roleKey === 'Platform Super Admin';
    const requestedOrgId = req.params.id;

    const orgId = requestedOrgId && requestedOrgId !== 'current' && isSuperAdmin
      ? requestedOrgId
      : tenantOrgId;

    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

    if (requestedOrgId && requestedOrgId !== 'current' && !isSuperAdmin && requestedOrgId !== tenantOrgId) {
      throw new ForbiddenError('Access denied: You are not authorized to view members of another organization');
    }

    const memberId = req.params.memberId;
    if (!memberId) {
      throw new ForbiddenError('Member identifier is required');
    }

    const member = await service.getMemberDetails(orgId, memberId);
    if (!member) {
      throw new NotFoundError(`Member '${memberId}' not found in this organization`);
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationBranding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

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

export const getOrganizationStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Organization tenant context is required');
    }

    const staff = await service.getStaff(orgId);
    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const inviteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const invitation = await service.inviteStaff(orgId, user.id, callerRole, req.body);

    res.status(201).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      throw new ForbiddenError('Authentication required to accept invitation');
    }

    const { token } = req.body;
    if (!token) {
      throw new ForbiddenError('Invitation token is required');
    }

    const member = await service.acceptInvitation(token, user.id, user.email, user.user_metadata?.role);

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const targetUserId = req.params.userId;
    const { role, locationId } = req.body;

    await service.updateMemberRole(orgId, user.id, callerRole, targetUserId, role, locationId);

    res.json({
      success: true,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    next(error);
  }
};


