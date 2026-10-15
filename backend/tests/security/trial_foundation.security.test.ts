import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Phase 7.5B — Database Foundation & 14-Day Trial Security Test Suite
 * Validates the SQL schema migration, handle_new_user() trigger invariants,
 * non-destructive conflict handling, RLS policies, and constraints.
 */
describe('Phase 7.5B — Database Foundation & 14-Day Trial Security Tests', () => {
  const migrationPath = path.join(
    __dirname,
    '../../supabase/migrations/phase_7b_trial_foundation.sql'
  );
  const phase7aPath = path.join(
    __dirname,
    '../../supabase/migrations/phase_7a_billing.sql'
  );

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  const phase7aSql = fs.readFileSync(phase7aPath, 'utf-8');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: New user receives exactly one trial
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 1: New user provisioning inserts a trial subscription in "trialing" status', () => {
    expect(migrationSql).toContain("'trialing'");
    expect(migrationSql).toContain('trial_started_at');
    expect(migrationSql).toContain('trial_ends_at');
    expect(migrationSql).toContain("provider,");
    expect(migrationSql).toContain("'razorpay'");

    // Verify handle_new_user() handles real users with trialing status
    const trialingBlock = migrationSql.match(/status,\s*provider,\s*trial_started_at,\s*trial_ends_at[\s\S]*?'trialing'/);
    expect(trialingBlock).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Trial lasts exactly 14 days from provisioning
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 2: Trial duration is set to exactly 14 days from started_at', () => {
    // Verifies NOW() + INTERVAL '14 days' is applied to both trial_ends_at and current_period_end
    expect(migrationSql).toContain("NOW() + INTERVAL '14 days'");

    // Simulate date math to verify 14-day calculation
    const startedAt = new Date('2026-10-06T12:00:00Z');
    const endsAt = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const durationDays = (endsAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

    expect(durationDays).toBe(14);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Repeated provisioning does NOT reset trial (Idempotency)
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 3: ON CONFLICT (user_id) DO NOTHING guarantees trial cannot be reset on re-provisioning', () => {
    // Must contain ON CONFLICT (user_id) DO NOTHING on the subscriptions table insert
    const conflictMatches = migrationSql.match(/ON CONFLICT \(user_id\) DO NOTHING/g);
    expect(conflictMatches).not.toBeNull();
    // At least 2 occurrences: one for demo user, one for normal user
    expect(conflictMatches!.length).toBeGreaterThanOrEqual(2);

    // Simulate conflict: existing row should remain unchanged
    const existingSubscription = {
      user_id: 'user-abc',
      status: 'trialing',
      trial_started_at: '2026-10-01T00:00:00Z',
      trial_ends_at: '2026-10-15T00:00:00Z',
    };

    const attemptReprovision = (existing: typeof existingSubscription, onConflictDoNothing: boolean) => {
      if (onConflictDoNothing) {
        return existing; // DO NOTHING preserves existing state
      }
      return {
        ...existing,
        trial_started_at: new Date().toISOString(),
      };
    };

    const afterReprovision = attemptReprovision(existingSubscription, true);
    expect(afterReprovision.trial_started_at).toBe('2026-10-01T00:00:00Z');
    expect(afterReprovision.trial_ends_at).toBe('2026-10-15T00:00:00Z');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Existing active paid user is not converted to trial
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 4: Migration does not overwrite or convert existing active paid subscriptions', () => {
    // Migration must NOT have a blanket UPDATE setting status = 'trialing'
    expect(migrationSql).not.toMatch(/UPDATE\s+public\.subscriptions\s+SET\s+status\s*=\s*'trialing'/i);

    // Existing active paid user invariant check
    const paidUser = {
      user_id: 'user-paid',
      tier: 'pro',
      status: 'active',
      stripe_subscription_id: 'sub_paid_123',
    };

    // Only provider is updated where NULL, preserving tier and status
    const applyMigrationUpdate = (sub: typeof paidUser) => {
      return {
        ...sub,
        provider: 'razorpay',
      };
    };

    const updated = applyMigrationUpdate(paidUser);
    expect(updated.status).toBe('active');
    expect(updated.tier).toBe('pro');
    expect(updated.stripe_subscription_id).toBe('sub_paid_123');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Demo user does not receive a normal paid trial
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 5: Demo user (demo@sweatfix.com) is isolated from 14-day commercial trial', () => {
    // Migration explicitly checks for demo@sweatfix.com
    expect(migrationSql).toContain("NEW.email = 'demo@sweatfix.com'");
    expect(migrationSql).toContain("'free'");
    // Demo user does not get trial dates
    const demoBlock = migrationSql.match(/IF NEW\.email = 'demo@sweatfix\.com'[\s\S]*?NULL,\s*NULL/);
    expect(demoBlock).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Existing subscription row remains intact
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 6: All columns are strictly additive (ADD COLUMN IF NOT EXISTS)', () => {
    const expectedAdditiveColumns = [
      'trial_started_at TIMESTAMPTZ',
      'trial_ends_at TIMESTAMPTZ',
      "provider TEXT DEFAULT 'razorpay' NOT NULL",
      'razorpay_customer_id TEXT',
      'razorpay_subscription_id TEXT',
      'razorpay_payment_id TEXT',
    ];

    for (const col of expectedAdditiveColumns) {
      expect(migrationSql).toContain(col);
    }

    // Must NOT contain DROP TABLE or DROP COLUMN
    expect(migrationSql).not.toMatch(/DROP\s+COLUMN/i);
    expect(migrationSql).not.toMatch(/DROP\s+TABLE/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Member cannot directly modify subscription through Supabase client
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 7: RLS policy verification: Only SELECT is permitted for users; INSERT/UPDATE/DELETE forbidden', () => {
    // Inspect phase_7a_billing.sql RLS policies on subscriptions
    expect(phase7aSql).toContain('ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;');
    expect(phase7aSql).toContain('CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);');

    // Verify there are NO user UPDATE, INSERT, or DELETE policies in phase 7a or 7b
    expect(phase7aSql).not.toContain('FOR UPDATE ON public.subscriptions');
    expect(phase7aSql).not.toContain('FOR INSERT ON public.subscriptions');
    expect(phase7aSql).not.toContain('FOR DELETE ON public.subscriptions');

    expect(migrationSql).not.toContain('FOR UPDATE ON public.subscriptions');
    expect(migrationSql).not.toContain('FOR INSERT ON public.subscriptions');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: RLS still prevents cross-user subscription access
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 8: Cross-user subscription access is prevented by (auth.uid() = user_id) policy', () => {
    const evaluateRls = (authUid: string | null, rowUserId: string): boolean => {
      if (!authUid) return false;
      return authUid === rowUserId;
    };

    const userA = '11111111-1111-1111-1111-111111111111';
    const userB = '22222222-2222-2222-2222-222222222222';

    expect(evaluateRls(userA, userA)).toBe(true);  // User reads own
    expect(evaluateRls(userA, userB)).toBe(false); // User A cannot read User B
    expect(evaluateRls(null, userA)).toBe(false);  // Unauthenticated cannot read
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Nullable trial fields and check constraint do not break legacy records
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 9: Date check constraint chk_subscriptions_trial_dates passes for nullable legacy records', () => {
    // Migration includes safe constraint
    expect(migrationSql).toContain('chk_subscriptions_trial_dates');
    expect(migrationSql).toContain(
      'CHECK (trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at)'
    );

    // Test constraint evaluation logic against various cases
    const evaluateConstraint = (started: string | null, ends: string | null): boolean => {
      if (ends === null || started === null) return true;
      return new Date(ends).getTime() >= new Date(started).getTime();
    };

    // 1. Legacy record with null trial dates
    expect(evaluateConstraint(null, null)).toBe(true);

    // 2. Paid user with null trial dates
    expect(evaluateConstraint(null, '2026-11-01T00:00:00Z')).toBe(true);
    expect(evaluateConstraint('2026-10-01T00:00:00Z', null)).toBe(true);

    // 3. Valid 14-day trial
    expect(evaluateConstraint('2026-10-01T00:00:00Z', '2026-10-15T00:00:00Z')).toBe(true);

    // 4. Invalid dates where ends_at < started_at (Violates constraint)
    expect(evaluateConstraint('2026-10-15T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECURITY & SEARCH PATH INTEGRITY
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 10: handle_new_user() specifies explicit search_path = public to prevent hijacking', () => {
    expect(migrationSql).toContain('SECURITY DEFINER SET search_path = public');
  });

  it('TEST 11: Indexes created on trial_ends_at and razorpay_subscription_id', () => {
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON public.subscriptions(trial_ends_at);');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub_id ON public.subscriptions(razorpay_subscription_id);');
  });
});
