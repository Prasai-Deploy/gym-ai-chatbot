import { Request, Response, NextFunction } from 'express';
import { TrainerService } from './trainer.service';
import { ForbiddenError, ValidationError } from '@errors/AppError';

const service = new TrainerService();

export const getTrainers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const search = req.query.search as string | undefined;

    const trainers = await service.getTrainers(callerRole, orgId, search);

    res.json({ success: true, data: trainers });
  } catch (error) {
    next(error);
  }
};

export const getTrainerDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const trainerUserId = req.params.trainerUserId;
    if (!trainerUserId) {
      throw new ValidationError('trainerUserId route parameter is required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const detail = await service.getTrainerDetail(user.id, callerRole, orgId, trainerUserId);

    res.json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const assignMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const assignment = await service.assignMember(user.id, callerRole, orgId, req.body);

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

export const removeAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationContext?.organizationId;
    const user = (req as any).user;
    if (!orgId || !user) {
      throw new ForbiddenError('Organization tenant context and authentication required');
    }

    const assignmentId = req.params.assignmentId;
    if (!assignmentId) {
      throw new ValidationError('assignmentId parameter is required');
    }

    const callerRole = req.organizationContext?.roleKey || user.user_metadata?.role || user.role || 'Member';
    const success = await service.removeAssignment(user.id, callerRole, orgId, assignmentId);

    res.json({ success, message: 'Assignment removed successfully' });
  } catch (error) {
    next(error);
  }
};
