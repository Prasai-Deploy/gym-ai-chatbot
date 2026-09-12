import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { RazorpayProvider } from '../../src/modules/billing/providers/RazorpayProvider';
import { BillingService } from '../../src/modules/billing/services/BillingService';
import { SubscriptionRepository } from '../../src/modules/billing/repositories/SubscriptionRepository';
import { Result, ok, fail } from '../../src/shared/core/Result';

describe('Sprint 5A.2 — Razorpay Billing & Payment Security Tests', () => {
  const testKeyId = 'rzp_test_key_12345';
  const testKeySecret = 'test_secret_key_88888888';
  const testWebhookSecret = 'test_whsec_secret_9999999';

  let provider: RazorpayProvider;

  beforeEach(() => {
    provider = new RazorpayProvider(testKeyId, testKeySecret, testWebhookSecret);
  });

  // Helper to calculate valid HMAC SHA256 signature
  const computeHmac = (payload: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  };

  // ── PAYMENT SIGNATURE TESTS ──────────────────────────────────────────────────

  it('1. Correct payment signature → accepted', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';
    const payload = `${paymentId}|${subId}`;
    const validSignature = computeHmac(payload, testKeySecret);

    const isValid = provider.verifyPaymentSignature(paymentId, subId, validSignature);
    expect(isValid).toBe(true);
  });

  it('2. Wrong signature → rejected', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';
    const wrongSignature = 'a'.repeat(64); // Invalid 64-char hex string

    const isValid = provider.verifyPaymentSignature(paymentId, subId, wrongSignature);
    expect(isValid).toBe(false);
  });

  it('3. Modified payload → rejected', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';
    const validSignature = computeHmac(`${paymentId}|${subId}`, testKeySecret);

    // Tampered payment ID
    const isValid = provider.verifyPaymentSignature('pay_TAMPERED', subId, validSignature);
    expect(isValid).toBe(false);
  });

  it('4. Empty signature → rejected', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';

    expect(provider.verifyPaymentSignature(paymentId, subId, '')).toBe(false);
  });

  it('5. Short/malformed signature (or old permissive valid_sig_) → rejected', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';

    // Insecure strings previously accepted in audit
    expect(provider.verifyPaymentSignature(paymentId, subId, 'valid_sig_striva_verification')).toBe(false);
    expect(provider.verifyPaymentSignature(paymentId, subId, 'sig_sim_12345')).toBe(false);
    expect(provider.verifyPaymentSignature(paymentId, subId, 'a'.repeat(32))).toBe(false);
  });

  it('6. Wrong secret → rejected', () => {
    const paymentId = 'pay_G12345678';
    const subId = 'sub_H87654321';
    const payload = `${paymentId}|${subId}`;
    const wrongSecretSig = computeHmac(payload, 'wrong_secret_12345');

    const isValid = provider.verifyPaymentSignature(paymentId, subId, wrongSecretSig);
    expect(isValid).toBe(false);
  });

  // ── WEBHOOK SIGNATURE TESTS ──────────────────────────────────────────────────

  it('7. Correct webhook signature → accepted', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_123' } });
    const validSignature = computeHmac(rawBody, testWebhookSecret);

    const isValid = provider.verifyWebhookSignature(rawBody, validSignature);
    expect(isValid).toBe(true);
  });

  it('8. Wrong webhook signature → rejected', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_123' } });
    const wrongSignature = 'b'.repeat(64);

    const isValid = provider.verifyWebhookSignature(rawBody, wrongSignature);
    expect(isValid).toBe(false);
  });

  it('9. Modified webhook body → rejected', () => {
    const originalBody = JSON.stringify({ event: 'payment.captured', amount: 149900 });
    const validSignature = computeHmac(originalBody, testWebhookSecret);

    const modifiedBody = JSON.stringify({ event: 'payment.captured', amount: 0 }); // Tampered body
    const isValid = provider.verifyWebhookSignature(modifiedBody, validSignature);
    expect(isValid).toBe(false);
  });

  it('10. Invalid webhook signature → causes no billing mutation in BillingService', async () => {
    const mockRepo = {
      recordPaymentEvent: vi.fn(),
      upsertSubscription: vi.fn(),
    } as unknown as SubscriptionRepository;

    const service = new BillingService(mockRepo);
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const invalidSig = 'invalid_sig';

    const result = await service.handleRazorpayWebhook(rawBody, invalidSig, { event: 'payment.captured' });

    expect(result.isFailure()).toBe(true);
    expect(result.error.message).toContain('Invalid Razorpay webhook signature');
    // Ensure zero database mutations occurred
    expect(mockRepo.recordPaymentEvent).not.toHaveBeenCalled();
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  // ── SUBSCRIPTION CREATION & CANCELLATION TESTS ──────────────────────────────

  it('11. Successful Razorpay subscription creation → calls REST API and returns provider response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'sub_real_razorpay_9999',
        order_id: 'order_real_1234',
        currency: 'INR',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await provider.createSubscription('usr-123', 'pro', 'monthly');

    expect(result.provider).toBe('razorpay');
    expect(result.subscriptionId).toBe('sub_real_razorpay_9999');
    expect(result.keyId).toBe(testKeyId);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/subscriptions',
      expect.objectContaining({ method: 'POST' })
    );

    vi.unstubAllGlobals();
  });

  it('12. Razorpay API failure during subscription creation → propagates error (Fail closed)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid Plan ID',
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(provider.createSubscription('usr-123', 'pro', 'monthly')).rejects.toThrow(
      'Razorpay API returned HTTP 400: Invalid Plan ID'
    );

    vi.unstubAllGlobals();
  });

  it('13. Cancellation success → calls Razorpay cancel endpoint and returns true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'sub_real_9999', status: 'cancelled' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const success = await provider.cancelSubscription('sub_real_9999', true);

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/subscriptions/sub_real_9999/cancel',
      expect.objectContaining({ method: 'POST' })
    );

    vi.unstubAllGlobals();
  });

  it('14. Cancellation failure → returns false and fails closed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Subscription not found',
    });
    vi.stubGlobal('fetch', mockFetch);

    const success = await provider.cancelSubscription('sub_nonexistent', true);

    expect(success).toBe(false);

    vi.unstubAllGlobals();
  });

  // ── FRONTEND & CODEBASE SECURITY REGRESSION CHECKS ─────────────────────────

  it('15. Frontend PricingPage.tsx does not contain pay_sim_ or sig_sim_ fallback logic', () => {
    const pricingPagePath = path.join(
      __dirname,
      '../../../src/features/billing/pages/PricingPage.tsx'
    );
    const content = fs.readFileSync(pricingPagePath, 'utf-8');

    expect(content).not.toContain('pay_sim_');
    expect(content).not.toContain('sig_sim_');
    expect(content).not.toContain('valid_sig_striva_verification');
  });

  it('16. RazorpayProvider.ts contains zero permissive signature fallbacks', () => {
    const providerPath = path.join(
      __dirname,
      '../../src/modules/billing/providers/RazorpayProvider.ts'
    );
    const content = fs.readFileSync(providerPath, 'utf-8');

    expect(content).not.toContain("startsWith('valid_sig_')");
    expect(content).not.toContain("startsWith('rzp_sig_')");
    expect(content).not.toContain('signature.length >= 32');
    expect(content).not.toContain('sub_rzp_');
  });
});
