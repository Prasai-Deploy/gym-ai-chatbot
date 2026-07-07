import { Request, Response, NextFunction } from 'express';
import { AuthError } from '@errors/AppError';
import { supabase } from '@database/supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
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

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    next(error);
  }
};
