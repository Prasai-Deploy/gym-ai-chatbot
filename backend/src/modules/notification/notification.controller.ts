import { Request, Response, NextFunction } from 'express';
import { NotificationService, notificationService } from './notification.service';
import { listNotificationsQuerySchema, markReadParamsSchema } from './notification.schemas';
import { ForbiddenError, ValidationError } from '@errors/AppError';

export class NotificationController {
  constructor(private readonly service: NotificationService = notificationService) {}

  /**
   * GET /api/v1/organizations/current/notifications
   */
  public listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationContext?.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Tenant context required');
      }

      const parsedQuery = listNotificationsQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        throw new ValidationError('Invalid notification query parameters', parsedQuery.error.format());
      }
      const query = parsedQuery.data;
      const user = (req as any).user;
      const role = req.organizationContext?.roleKey || user?.role || 'Member';

      const result = await this.service.listNotifications(orgId, user.id, role, query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/organizations/current/notifications/unread-count
   */
  public getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationContext?.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Tenant context required');
      }

      const user = (req as any).user;
      const role = req.organizationContext?.roleKey || user?.role || 'Member';

      const result = await this.service.getUnreadCount(orgId, user.id, role);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/organizations/current/notifications/attention
   */
  public getAttentionSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationContext?.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Tenant context required');
      }

      const user = (req as any).user;
      const role = req.organizationContext?.roleKey || user?.role || 'Member';

      const result = await this.service.getAttentionSummary(orgId, user.id, role);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/organizations/current/notifications/:id/read
   */
  public markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationContext?.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Tenant context required');
      }

      const parsedParams = markReadParamsSchema.safeParse(req.params);
      if (!parsedParams.success) {
        throw new ValidationError('Invalid notification ID', parsedParams.error.format());
      }
      const { id } = parsedParams.data;
      const user = (req as any).user;
      const role = req.organizationContext?.roleKey || user?.role || 'Member';

      const notification = await this.service.markAsRead(orgId, id, user.id, role);
      res.status(200).json({
        success: true,
        data: { notification },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/organizations/current/notifications/mark-all-read
   */
  public markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationContext?.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Tenant context required');
      }

      const user = (req as any).user;
      const role = req.organizationContext?.roleKey || user?.role || 'Member';

      const result = await this.service.markAllAsRead(orgId, user.id, role);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const notificationController = new NotificationController();
