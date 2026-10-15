import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { ForbiddenError, ValidationError } from '@errors/AppError';

const service = new AttendanceService();

export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const record = await service.checkIn(user.id, callerRole, orgId, req.body);

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const attendanceId = req.body.attendanceId;
    if (!attendanceId) {
      throw new ValidationError('attendanceId is required for check-out');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const record = await service.checkOut(user.id, callerRole, orgId, attendanceId);

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getTodayAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const overview = await service.getTodayOverview(orgId);
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const isStaff = ['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer'].includes(callerRole);

    let targetUserId = req.query.userId as string | undefined;

    if (!targetUserId && !isStaff) {
      // Member defaulting to own history
      targetUserId = user.id;
    }

    // If querying another user's history, must be staff
    if (targetUserId && targetUserId !== user.id) {
      if (!isStaff) {
        throw new ForbiddenError('Members cannot view attendance history of other members');
      }
    }

    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const history = await service.getHistory(orgId, targetUserId, limit);

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const searchMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Organization tenant context required');
    }

    const query = (req.query.q as string) || (req.query.search as string) || '';
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const results = await service.searchMembers(orgId, query, limit);

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};


