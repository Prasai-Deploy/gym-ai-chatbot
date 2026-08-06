import { Request, Response, NextFunction } from 'express';
import { AuthError } from '@errors/AppError';

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
      const userRole = (req as any).user?.role || req.organizationContext?.roleKey || 'Member';

      if (userRole === 'Platform Super Admin') {
        return next();
      }

      if (!allowedRoles.includes(userRole as UserRole)) {
        throw new AuthError(`Role '${userRole}' is not authorized to perform this operation.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
