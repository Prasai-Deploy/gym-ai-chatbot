import { Request, Response, NextFunction } from 'express';
import { OrgBillingService, orgBillingService } from './orgBilling.service';
import {
  CreateOrgCheckoutDTO,
  VerifyOrgPaymentDTO,
  CancelOrgSubscriptionDTO,
  UpdateOrgBillingAccountDTO,
  InvoiceQuerySchema,
} from './orgBilling.schemas';
import { ForbiddenError, ValidationError } from '@errors/AppError';

export class OrgBillingController {
  constructor(private readonly service: OrgBillingService = orgBillingService) {}

  private getOrgId(req: Request): string {
    const orgId = req.organizationContext?.organizationId;
    if (!orgId) {
      throw new ForbiddenError('Tenant organization context not resolved or unauthorized.');
    }
    return orgId;
  }

  public getBillingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const data = await this.service.getBillingStatus(orgId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  public getPlans = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await this.service.getPlans();
      return res.status(200).json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  };

  public getBillingAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const account = await this.service.getBillingAccount(orgId);
      return res.status(200).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  };

  public updateBillingAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const validated = UpdateOrgBillingAccountDTO.parse(req.body);
      const account = await this.service.updateBillingAccount(orgId, validated);
      return res.status(200).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  };

  public createCheckout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const validated = CreateOrgCheckoutDTO.parse(req.body);
      const session = await this.service.createCheckoutIntent(orgId, validated);
      return res.status(200).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  };

  public verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const validated = VerifyOrgPaymentDTO.parse(req.body);
      const result = await this.service.verifyPayment(orgId, validated);
      return res.status(200).json({
        success: true,
        data: result,
        message: 'Payment verified and organization subscription activated successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  public cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const validated = CancelOrgSubscriptionDTO.parse(req.body);
      const sub = await this.service.cancelSubscription(
        orgId,
        validated.cancel_at_period_end,
        validated.reason
      );
      return res.status(200).json({
        success: true,
        data: sub,
        message: 'Organization subscription cancellation scheduled.',
      });
    } catch (err) {
      next(err);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const query = InvoiceQuerySchema.parse(req.query);
      const result = await this.service.getInvoices(orgId, query);
      return res.status(200).json({
        success: true,
        data: result.invoices,
        meta: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const invoice = await this.service.getInvoiceById(orgId, req.params.invoiceId);
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  public getFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = this.getOrgId(req);
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const summary = await this.service.getFinancialSummary(orgId, from, to);
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };

  public handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      if (!signature) {
        throw new ValidationError('Missing x-razorpay-signature header');
      }

      const result = await this.service.handleWebhook(rawBody, signature, req.body);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };
}

export const orgBillingController = new OrgBillingController();
