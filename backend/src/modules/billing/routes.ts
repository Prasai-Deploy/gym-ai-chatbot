import { Router } from 'express';
import { BillingController } from './controllers/BillingController';
import { BillingService } from './services/BillingService';
import { SubscriptionRepository } from './repositories/SubscriptionRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { requireRoles } from '@middleware/rbac.middleware';
import { orgBillingRouter } from './organization/orgBilling.routes';
import { orgBillingController } from './organization/orgBilling.controller';

const router = Router();

// DI Wiring
const repository = new SubscriptionRepository(supabase);
const service = new BillingService(repository);
const controller = new BillingController(service);

// Core Billing Routes (Protected by Auth)
router.get('/status', requireAuth, controller.getStatus);
router.post('/checkout', requireAuth, controller.createCheckout);
router.delete('/subscription', requireAuth, controller.cancelSubscription);
router.get('/invoices', requireAuth, controller.getInvoices);

// Razorpay Dedicated Endpoints
router.post('/razorpay/checkout', requireAuth, controller.createRazorpayCheckout);
router.post('/razorpay/verify', requireAuth, controller.verifyRazorpayPayment);

// Canonical Authoritative Consumer Razorpay Webhook (Cryptographically Authenticated via HMAC SHA-256)
router.post('/webhook/razorpay', controller.handleRazorpayWebhook);

// Organization B2B Dedicated Razorpay Webhook (Cryptographically Authenticated via HMAC SHA-256)
router.post('/webhook/razorpay/organization', orgBillingController.handleWebhook);
router.post('/webhook/organization', orgBillingController.handleWebhook);

// Organization B2B Billing Sub-routes
router.use('/organization', orgBillingRouter);

// Admin Analytics (Protected by RBAC to strictly isolate platform-wide billing metrics to Platform Super Admin)
router.get(
  '/admin/metrics',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner']),
  controller.getAdminMetrics
);

// Legacy Webhook Endpoint Deprecated — Phase 7.5D Hardening
// Fails closed with HTTP 410 Gone to prevent unauthenticated/unverified webhook processing
router.post('/webhook', (_req, res) => {
  return res.status(410).json({
    success: false,
    error: {
      code: 'ENDPOINT_DEPRECATED',
      message:
        'Legacy webhook endpoint is deprecated. Use canonical /api/v1/billing/webhook/razorpay with cryptographic HMAC signature.',
    },
  });
});

export const billingRouter = router;
