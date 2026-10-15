import { z } from 'zod';

export const OrgSubscriptionStatusEnum = z.enum([
  'none',
  'pending_checkout',
  'active',
  'past_due',
  'grace_period',
  'cancelled',
  'expired',
]);

export const OrgBillingIntervalEnum = z.enum(['monthly', 'yearly']);

export const UpdateOrgBillingAccountDTO = z.object({
  billing_name: z.string().min(1).max(255).optional(),
  billing_email: z.string().email().optional(),
  tax_id: z.string().max(50).optional().nullable(),
  billing_address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().default('India'),
    })
    .optional(),
});
export type UpdateOrgBillingAccountDTOType = z.infer<typeof UpdateOrgBillingAccountDTO>;

export const CreateOrgCheckoutDTO = z.object({
  plan_code: z.string().min(1, 'plan_code is required'),
  interval: OrgBillingIntervalEnum.default('monthly'),
});
export type CreateOrgCheckoutDTOType = z.infer<typeof CreateOrgCheckoutDTO>;

export const VerifyOrgPaymentDTO = z.object({
  razorpay_payment_id: z.string().min(1, 'Missing razorpay_payment_id'),
  razorpay_order_id: z.string().optional(),
  razorpay_subscription_id: z.string().optional(),
  razorpay_signature: z.string().min(1, 'Missing razorpay_signature'),
  plan_code: z.string().min(1, 'Missing plan_code'),
});
export type VerifyOrgPaymentDTOType = z.infer<typeof VerifyOrgPaymentDTO>;

export const CancelOrgSubscriptionDTO = z.object({
  cancel_at_period_end: z.boolean().default(true),
  reason: z.string().max(500).optional(),
});
export type CancelOrgSubscriptionDTOType = z.infer<typeof CancelOrgSubscriptionDTO>;

export const OrgWebhookPayloadSchema = z
  .object({
    entity: z.string().optional(),
    account_id: z.string().optional(),
    event: z.string().min(1, 'Missing webhook event name'),
    event_id: z.string().optional(),
    id: z.string().optional(),
    created_at: z.number().optional(),
    contains: z.array(z.string()).optional(),
    payload: z.record(z.any()).optional().default({}),
  })
  .passthrough();
export type OrgWebhookPayload = z.infer<typeof OrgWebhookPayloadSchema>;

export const InvoiceQuerySchema = z.object({
  status: z.enum(['paid', 'unpaid', 'void', 'failed']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type InvoiceQuerySchemaType = z.infer<typeof InvoiceQuerySchema>;
