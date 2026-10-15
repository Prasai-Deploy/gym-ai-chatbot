import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/BillingService';
import {
  CreateCheckoutDTO,
  VerifyRazorpayPaymentDTO,
} from '../domain/BillingSchemas';
import { ValidationError } from '@errors/AppError';

export class BillingController {
  constructor(private readonly service: BillingService) {}

  public getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const userId = user.id;

      const userRole: string =
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        req.organizationContext?.roleKey ||
        user.role ||
        'Member';

      const userContext = {
        id: userId,
        email: user.email,
        role: userRole,
      };

      const result = await this.service.getSubscriptionStatus(userId, userContext);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public createCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = CreateCheckoutDTO.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0].message);
      }

      const result = await this.service.createCheckoutSession(
        userId,
        (parsed.data.tier as any) || 'pro',
        parsed.data.interval,
        parsed.data.successUrl,
        parsed.data.cancelUrl
      );

      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public createRazorpayCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const userId = user.id;
      const parsed = CreateCheckoutDTO.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0].message);
      }

      const result = await this.service.createRazorpayCheckout(
        userId,
        (parsed.data.tier as any) || 'pro',
        parsed.data.interval,
        { email: user?.email, role: user?.role }
      );

      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public verifyRazorpayPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = VerifyRazorpayPaymentDTO.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0].message);
      }

      const result = await this.service.verifyRazorpayPayment(userId, parsed.data);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = (req.headers['x-razorpay-signature'] || '') as string;
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : undefined);

      if (!rawBody) {
        throw new ValidationError('Missing raw request body for webhook signature verification');
      }

      const result = await this.service.handleRazorpayWebhook(rawBody, signature, req.body);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        received: true,
        processed: result.value.processed,
        reason: result.value.reason,
      });
    } catch (err) {
      next(err);
    }
  };

  public cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.cancelSubscription(userId);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getInvoices(userId);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAdminMetrics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getAdminMetrics();
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };
}
