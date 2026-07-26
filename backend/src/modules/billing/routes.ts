import { Router } from 'express';
import { BillingController } from './controllers/BillingController';
import { BillingService } from './services/BillingService';
import { SubscriptionRepository } from './repositories/SubscriptionRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';

const router = Router();

// DI Wiring
const repository = new SubscriptionRepository(supabase);
const service = new BillingService(repository);
const controller = new BillingController(service);

// Core Billing Routes
router.get('/status', requireAuth, controller.getStatus);
router.post('/checkout', requireAuth, controller.createCheckout);
router.patch('/subscription', requireAuth, controller.updateSubscription);
router.delete('/subscription', requireAuth, controller.cancelSubscription);
router.get('/invoices', requireAuth, controller.getInvoices);

// Razorpay Dedicated Endpoints
router.post('/razorpay/checkout', requireAuth, controller.createRazorpayCheckout);
router.post('/razorpay/verify', requireAuth, controller.verifyRazorpayPayment);
router.post('/webhook/razorpay', controller.handleRazorpayWebhook);

// Admin Analytics
router.get('/admin/metrics', requireAuth, controller.getAdminMetrics);

// Legacy/Generic Webhook
router.post('/webhook', controller.handleWebhook);

export const billingRouter = router;
