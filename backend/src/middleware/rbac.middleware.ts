import { Request, Response, NextFunction } from 'express';
import { AuthError, ForbiddenError } from '@errors/AppError';

export type UserRole =
  | 'Platform Super Admin'
  | 'Organization Owner'
  | 'Gym Manager'
  | 'Front Desk'
  | 'Trainer'
  | 'Nutritionist'
  | 'Member'
  | 'Demo User';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthError('Authentication required');
      }

      let userRole: string =
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        req.organizationContext?.roleKey ||
        user.role ||
        'Member';

      if (userRole === 'Gym Owner') {
        userRole = 'Organization Owner';
      }

      if (userRole === 'Platform Super Admin') {
        return next();
      }

      if (!allowedRoles.includes(userRole as UserRole)) {
        throw new ForbiddenError(`Access Denied: Role '${userRole}' is not authorized to perform this operation.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

