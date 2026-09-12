import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@database/supabase';
import { AppError, AuthError, ForbiddenError, ValidationError } from '@errors/AppError';

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

const readHeader = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const createTenantMiddleware =
  (database: SupabaseClient) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        throw new AuthError('Authentication is required before resolving organization access');
      }

      const requestedOrganizationId = readHeader(req.headers['x-organization-id']);
      const requestedLocationId = readHeader(req.headers['x-location-id']);
      const trustedPlatformRole = user.app_metadata?.role;

      if (requestedOrganizationId && !isUuid(requestedOrganizationId)) {
        throw new ValidationError('Invalid organization identifier');
      }
      if (requestedLocationId && !isUuid(requestedLocationId)) {
        throw new ValidationError('Invalid location identifier');
      }

      if (trustedPlatformRole === 'Platform Super Admin') {
        const organizationId = requestedOrganizationId || user.app_metadata?.organization_id;
        if (!organizationId || !isUuid(organizationId)) {
          throw new ValidationError('An organization identifier is required');
        }
        req.organizationContext = {
          organizationId,
          locationId: requestedLocationId,
          roleKey: trustedPlatformRole,
        };
        return next();
      }

      let staffQuery = database
        .from('organization_staff')
        .select('organization_id, location_id, role_key')
        .eq('user_id', user.id);
      if (requestedOrganizationId)
        staffQuery = staffQuery.eq('organization_id', requestedOrganizationId);

      const { data: staff, error: staffError } = await staffQuery.limit(1).maybeSingle();
      if (staffError) {
        throw new AppError('Unable to verify organization membership', 500);
      }

      let organizationId: string | undefined = staff?.organization_id;
      let locationId: string | undefined = staff?.location_id || undefined;
      const roleKey: string = staff?.role_key || 'Member';

      if (!organizationId) {
        let profileQuery = database.from('profiles').select('organization_id').eq('id', user.id);
        if (requestedOrganizationId)
          profileQuery = profileQuery.eq('organization_id', requestedOrganizationId);

        const { data: profile, error: profileError } = await profileQuery.maybeSingle();
        if (profileError) {
          throw new AppError('Unable to verify organization membership', 500);
        }
        organizationId = profile?.organization_id;
      }

      if (!organizationId) {
        throw new ForbiddenError('You do not have access to this organization');
      }

      if (requestedLocationId) {
        if (locationId && locationId !== requestedLocationId) {
          throw new ForbiddenError('You do not have access to this location');
        }
        const { data: location, error: locationError } = await database
          .from('organization_locations')
          .select('id')
          .eq('id', requestedLocationId)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (locationError || !location) {
          throw new ForbiddenError('You do not have access to this location');
        }
        locationId = requestedLocationId;
      }

      req.organizationContext = {
        organizationId,
        locationId,
        roleKey,
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };

export const tenantMiddleware = createTenantMiddleware(supabaseAdmin);
