import { Request, Response, NextFunction } from 'express';
import { supabase } from '@database/supabase';
import { ForbiddenError } from '@errors/AppError';

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

/**
 * Server-Side Tenant Resolution Middleware — Phase 4
 *
 * Enforces server-validated organization membership resolution for authenticated users.
 * Never trusts raw `x-organization-id` headers alone or arbitrary client body params as proof of tenancy.
 * Never uses hardcoded fallback UUIDs (e.g. '00000000-0000-0000-0000-000000000001').
 */
export const tenantMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    // If not authenticated yet, proceed (requireAuth will enforce downstream for protected routes)
    if (!user || !user.id) {
      return next();
    }

    // Determine if client requested a specific organization context (via header, query, or body)
    const requestedOrgId = (
      (req.headers && (req.headers['x-organization-id'] as string)) ||
      (req.query && (req.query.organization_id as string)) ||
      (req.body && req.body.organization_id)
    )?.trim();

    // Query user's database organization memberships
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id);

    // Also check if user is owner of any organization
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id);

    const memberOrgIds = new Set<string>();
    const orgRoleMap = new Map<string, string>();

    if (memberships) {
      memberships.forEach((m: any) => {
        memberOrgIds.add(m.organization_id);
        orgRoleMap.set(m.organization_id, m.role || 'Member');
      });
    }

    if (ownedOrgs) {
      ownedOrgs.forEach((o: any) => {
        memberOrgIds.add(o.id);
        if (!orgRoleMap.has(o.id)) {
          orgRoleMap.set(o.id, 'Organization Owner');
        }
      });
    }

    // Demo User guard: Demo accounts cannot be Platform Super Admin or Staff
    const isDemoUser =
      user.email?.toLowerCase() === 'demo@sweatfix.com' ||
      user.user_metadata?.role === 'Demo User';

    // Platform Super Admin bypasses membership check if requested
    const isSuperAdmin =
      !isDemoUser &&
      (user.user_metadata?.role === 'Platform Super Admin' ||
        user.app_metadata?.role === 'Platform Super Admin');

    let resolvedOrgId: string | undefined = undefined;
    let resolvedRole: string = isDemoUser ? 'Demo User' : 'Member';

    if (requestedOrgId) {
      if (memberOrgIds.has(requestedOrgId) || isSuperAdmin) {
        resolvedOrgId = requestedOrgId;
        resolvedRole = isDemoUser
          ? 'Demo User'
          : orgRoleMap.get(requestedOrgId) || (isSuperAdmin ? 'Platform Super Admin' : 'Member');
      } else {
        // User requested an organization they DO NOT belong to -> Fail closed (403 Forbidden)
        throw new ForbiddenError(`Access Denied: User does not belong to requested organization '${requestedOrgId}'`);
      }
    } else if (memberOrgIds.size > 0) {
      // Pick user's primary/first organization membership
      resolvedOrgId = Array.from(memberOrgIds)[0];
      resolvedRole = isDemoUser ? 'Demo User' : orgRoleMap.get(resolvedOrgId) || 'Member';
    }

    if (resolvedOrgId) {
      req.organizationContext = {
        organizationId: resolvedOrgId,
        locationId: (req.headers['x-location-id'] as string) || undefined,
        roleKey: resolvedRole,
      };
    }


    next();
  } catch (error) {
    next(error);
  }
};

