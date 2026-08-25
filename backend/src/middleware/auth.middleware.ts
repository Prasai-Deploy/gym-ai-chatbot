import { Request, Response, NextFunction } from 'express';
import { AuthError, ForbiddenError } from '@errors/AppError';
import { supabase } from '@database/supabase';
import { UserRole } from './rbac.middleware';

/**
 * Allowed administrative roles for STRIVA v4 Admin Module endpoints.
 */
export const ALLOWED_ADMIN_ROLES: UserRole[] = [
  'Platform Super Admin',
  'Organization Owner',
  'Gym Manager',
];

/**
 * Authentication middleware — verifies JWT token and populates req.user.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AuthError('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthError('Invalid or expired token');
    }

    (req as any).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Authorization middleware — verifies authenticated user possesses an administrative role.
 * Rejects Member users and non-admin staff roles (Trainer, Nutritionist, Front Desk, Demo User).
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Ensure user is authenticated
    if (!(req as any).user) {
      return requireAuth(req, res, (err?: any) => {
        if (err) return next(err);
        verifyAdminRole(req, next);
      });
    }

    verifyAdminRole(req, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Internal helper to evaluate authenticated user role against allowed admin roles.
 * Uses existing STRIVA RBAC claims from user metadata or organization staff context.
 * Never trusts client headers (e.g. x-role) or client body parameters.
 */
function verifyAdminRole(req: Request, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    throw new AuthError('Authentication required to access administrative resources');
  }

  // Derive role exclusively from verified JWT identity claims or backend tenant context
  const userRole: string =
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    user.role ||
    req.organizationContext?.roleKey ||
    'Member';

  // Platform Super Admin bypasses domain checks
  if (userRole === 'Platform Super Admin') {
    return next();
  }

  if (!ALLOWED_ADMIN_ROLES.includes(userRole as UserRole)) {
    throw new ForbiddenError(
      `Access denied: Role '${userRole}' is not authorized to access administrative endpoints`
    );
  }

  next();
}
