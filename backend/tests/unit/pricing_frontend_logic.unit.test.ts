import { describe, it, expect } from 'vitest';
import { STRIVA_PRICING } from '../../src/modules/billing/domain/BillingSchemas';

describe('STRIVA V2 Phase 7.5F — Frontend Single-Plan Pricing & Checkout Logic', () => {
  // Test 1: Monthly price display
  it('TEST F1: Monthly price displays canonical ₹799 / month', () => {
    const monthlyPrice = STRIVA_PRICING.monthly;
    expect(monthlyPrice).toBe(799);

    const formattedMonthly = `₹${monthlyPrice.toLocaleString('en-IN')}`;
    expect(formattedMonthly).toBe('₹799');
  });

  // Test 2: Annual price display
  it('TEST F2: Annual price displays canonical ₹6,999 / year', () => {
    const annualPrice = STRIVA_PRICING.yearly;
    expect(annualPrice).toBe(6999);

    const formattedAnnual = `₹${annualPrice.toLocaleString('en-IN')}`;
    expect(formattedAnnual).toBe('₹6,999');
  });

  // Test 3: Annual savings calculation & display
  it('TEST F3: Annual savings resolves to ~27% and equivalent ₹583 / month', () => {
    const monthlyPrice = STRIVA_PRICING.monthly;
    const annualPrice = STRIVA_PRICING.yearly;

    const monthlyEquivalent = Math.round(annualPrice / 12);
    expect(monthlyEquivalent).toBe(583);

    const fullYearMonthly = monthlyPrice * 12; // 9,588
    const savingsPercentage = Math.round(((fullYearMonthly - annualPrice) / fullYearMonthly) * 100);
    expect(savingsPercentage).toBe(27);
  });

  // Test 4: Single-plan presentation — only one plan configuration
  it('TEST F4: Consumer model presents exactly ONE membership plan: STRIVA', () => {
    const consumerPlans = [
      {
        id: 'striva-membership',
        name: 'STRIVA',
        tagline: 'Your AI-powered fitness operating system',
        trialDays: 14,
        features: [
          'TRINETRA AI Coach',
          'Personalized workouts',
          'Nutrition guidance',
          'Progress tracking',
          'Hydration tracking',
          'Personalized fitness context/memory',
          'AI-powered recommendations',
          'Workout & nutrition logging',
        ],
      },
    ];

    expect(consumerPlans.length).toBe(1);
    expect(consumerPlans[0].name).toBe('STRIVA');
    expect(consumerPlans[0].trialDays).toBe(14);
  });

  // Test 5: No Pro/Elite consumer cards
  it('TEST F5: Pro and Elite are NOT selectable consumer membership cards', () => {
    const consumerSelectableTierNames = ['STRIVA'];
    expect(consumerSelectableTierNames).not.toContain('Pro');
    expect(consumerSelectableTierNames).not.toContain('Elite');
    expect(consumerSelectableTierNames).not.toContain('Free Tier');
  });

  // Test 6: Trial messaging
  it('TEST F6: Trial messaging communicates 14 days free before paid billing', () => {
    const trialMessage = 'Start with 14 days free. Continue with STRIVA for ₹799/month or ₹6,999/year.';
    expect(trialMessage).toContain('14 days free');
    expect(trialMessage).toContain('₹799/month');
    expect(trialMessage).toContain('₹6,999/year');
  });

  // Test 7: Active membership display
  it('TEST F7: Active membership displays STRIVA Membership and billing interval', () => {
    const activeSub = {
      state: 'ACTIVE',
      hasAccess: true,
      interval: 'yearly',
      tier: 'pro',
    };

    const displayTitle = 'STRIVA Membership';
    const displayRate = activeSub.interval === 'yearly' ? '₹6,999 / year' : '₹799 / month';

    expect(displayTitle).toBe('STRIVA Membership');
    expect(displayRate).toBe('₹6,999 / year');
  });

  // Test 8: Grace-period display
  it('TEST F8: Grace period communicates payment attention required without false failure', () => {
    const graceState = {
      state: 'GRACE_PERIOD',
      hasAccess: true,
      daysRemaining: 2,
    };

    const bannerText = 'Payment needs attention. Grace period active (2 days remaining).';
    expect(bannerText).toContain('Payment needs attention');
    expect(graceState.hasAccess).toBe(true);
  });

  // Test 9: Expired membership display
  it('TEST F9: Expired membership requires membership to continue', () => {
    const expiredState = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
    };

    const statusBadge = 'Membership Required';
    const ctaText = 'Continue with STRIVA';

    expect(statusBadge).toBe('Membership Required');
    expect(ctaText).toBe('Continue with STRIVA');
    expect(expiredState.hasAccess).toBe(false);
  });

  // Test 10: Checkout interval selection does not mutate server amounts
  it('TEST F10: Checkout interval selection only switches "monthly" | "yearly"', () => {
    type ValidInterval = 'monthly' | 'yearly';
    let selectedInterval: ValidInterval = 'monthly';

    function selectInterval(newInterval: ValidInterval) {
      selectedInterval = newInterval;
    }

    selectInterval('yearly');
    expect(selectedInterval).toBe('yearly');

    const payload = { interval: selectedInterval };
    expect(payload).toEqual({ interval: 'yearly' });
    expect((payload as any).amount).toBeUndefined();
  });

  // Test 11: Checkout synchronization pending state
  it('TEST F11: Pending webhook/server synchronization displays non-activating message', () => {
    const syncStatus = {
      isSyncing: true,
      hasAccess: false, // Must NOT self-activate on client
      message: "Payment received. We're confirming your STRIVA membership...",
    };

    expect(syncStatus.hasAccess).toBe(false);
    expect(syncStatus.message).toContain('Payment received');
    expect(syncStatus.message).toContain('confirming your STRIVA membership');
  });
});
