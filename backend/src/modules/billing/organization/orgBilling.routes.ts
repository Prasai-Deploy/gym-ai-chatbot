import { Router } from 'express';
import { orgBillingController } from './orgBilling.controller';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';

export const orgBillingRouter = Router();

// Webhook endpoint: Direct from Razorpay, cryptographically verified by HMAC SHA-256 signature
orgBillingRouter.post('/webhook', orgBillingController.handleWebhook);

// Protected routes: Strict Tenant Resolution & Owner/SuperAdmin RBAC
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(tenantMiddleware);
protectedRouter.use(requireRoles(['Platform Super Admin', 'Organization Owner']));

protectedRouter.get('/status', orgBillingController.getBillingStatus);
protectedRouter.get('/plans', orgBillingController.getPlans);
protectedRouter.get('/account', orgBillingController.getBillingAccount);
protectedRouter.patch('/account', orgBillingController.updateBillingAccount);
protectedRouter.post('/checkout', orgBillingController.createCheckout);
protectedRouter.post('/verify', orgBillingController.verifyPayment);
protectedRouter.post('/cancel', orgBillingController.cancelSubscription);
protectedRouter.delete('/subscription', orgBillingController.cancelSubscription);
protectedRouter.get('/invoices', orgBillingController.getInvoices);
protectedRouter.get('/invoices/:invoiceId', orgBillingController.getInvoiceById);
protectedRouter.get('/financials', orgBillingController.getFinancialSummary);

orgBillingRouter.use('/', protectedRouter);
