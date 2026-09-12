import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/BillingService';
import { CreateCheckoutDTO } from '../domain/BillingSchemas';
import { ValidationError } from '@errors/AppError';

export class BillingController {
  constructor(private readonly service: BillingService) {}

  public getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getSubscriptionStatus(userId);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value
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
        parsed.data.tier,
        parsed.data.interval,
        parsed.data.successUrl,
        parsed.data.cancelUrl
      );

      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value
      });
    } catch (err) {
      next(err);
    }
  };

  public createRazorpayCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = CreateCheckoutDTO.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0].message);
      }

      const result = await this.service.createRazorpayCheckout(
        userId,
        parsed.data.tier,
        parsed.data.interval
      );

      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value
      });
    } catch (err) {
      next(err);
    }
  };

  public verifyRazorpayPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, tier, interval } = req.body;

      if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
        throw new ValidationError('Missing required Razorpay payment signature parameters');
      }

      const result = await this.service.verifyRazorpayPayment(userId, {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        tier: tier || 'pro',
        interval: interval || 'monthly'
      });

      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value
      });
    } catch (err) {
      next(err);
    }
  };

  public handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = (req.headers['x-razorpay-signature'] || req.headers['x-signature'] || '') as string;
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      const result = await this.service.handleRazorpayWebhook(rawBody, signature, req.body);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        received: true,
        processed: result.value.processed
      });
    } catch (err) {
      next(err);
    }
  };

  public updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { tier, interval } = req.body;

      const result = await this.service.updateSubscription(userId, tier, interval || 'monthly');
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        success: true,
        data: result.value
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
        data: result.value
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
        data: result.value
      });
    } catch (err) {
      next(err);
    }
  };

  public handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.headers['x-event-id'] as string || `evt_${Date.now()}`;
      const eventType = req.body.type || 'checkout.session.completed';

      const result = await this.service.handleWebhook(eventId, eventType, req.body);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({
        received: true,
        processed: result.value.processed
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
        data: result.value
      });
    } catch (err) {
      next(err);
    }
  };
}
