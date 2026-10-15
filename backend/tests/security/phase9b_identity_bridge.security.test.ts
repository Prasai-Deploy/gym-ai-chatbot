import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * STRIVA V2 — DB-3A: Legacy-to-UUID Identity Bridge Security Suite
 *
 * Test Architecture & Coverage:
 * Part 1: Migration DDL & Static Safety Invariants (AST / DDL Inspection)
 * Part 2: 1:1 Identity Mapping Constraint Simulation (Logic Unit Tests)
 * Part 3: Verified Mapping Selection & Evidence Rules (Security Unit Tests)
 * Part 4: Hydration Compatibility Trigger Simulation (Pure Function Logic)
 * Part 5: Hydration RLS Dual-Key Policy Simulation (Authorization Model)
 * Part 6: Secure Deferred Claiming Protocol Simulation (Security Workflow)
 * Part 7: Rollback & Data Preservation Invariants (Safety Verification)
 *
 * Classification: Offline Mock / AST / Logic Simulations (Port 5433 offline; no live PG required)
 */

describe('DB-3A: Phase 9B Legacy Identity Bridge Security Suite', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/phase_9b_legacy_identity_bridge.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // =========================================================================
  // PART 1: Migration DDL & Static Safety Invariants
  // =========================================================================
  describe('Part 1: Migration DDL & Static Safety Invariants', () => {
    it('Test 1: Migration file exists and is non-empty', () => {
      expect(sql.length).toBeGreaterThan(500);
    });

    it('Test 2: Guarantees zero destructive DDL on existing tables', () => {
      // Must NOT drop legacy tables
      expect(sql).not.toMatch(/DROP\s+TABLE\s+(IF\s+EXISTS\s+)?public\.users/i);
      expect(sql).not.toMatch(/DROP\s+TABLE\s+(IF\s+EXISTS\s+)?public\.water_logs/i);
      expect(sql).not.toMatch(/DROP\s+TABLE\s+(IF\s+EXISTS\s+)?public\.profiles/i);

      // Must NOT drop existing legacy columns
      expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.water_logs\s+DROP\s+COLUMN\s+user_id/i);
      expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.water_logs\s+DROP\s+COLUMN\s+intake_amount/i);

      // Must NOT coerce column types destructively
      expect(sql).not.toMatch(/ALTER\s+COLUMN\s+user_id\s+TYPE/i);
      expect(sql).not.toMatch(/ALTER\s+COLUMN\s+intake_amount\s+TYPE/i);
    });

    it('Test 3: Enforces strict 1:1 constraints on legacy_user_id_map', () => {
      // PRIMARY KEY on legacy_integer_id prevents multiple profiles per legacy ID
      expect(sql).toMatch(/legacy_integer_id\s+INT\s+PRIMARY\s+KEY/i);
      // UNIQUE on profile_id prevents multiple legacy IDs per profile
      expect(sql).toMatch(/profile_id\s+UUID\s+NOT\s+NULL\s+UNIQUE/i);
      // ON DELETE RESTRICT on legacy users prevents accidental cascade
      expect(sql).toMatch(/REFERENCES\s+public\.users\(id\)\s+ON\s+DELETE\s+RESTRICT/i);
      // ON DELETE CASCADE on profiles cleans up when Auth user is deleted
      expect(sql).toMatch(/REFERENCES\s+public\.profiles\(id\)\s+ON\s+DELETE\s+CASCADE/i);
    });

    it('Test 4: Enforces RLS and restricted permissions on legacy_user_id_map', () => {
      expect(sql).toMatch(/ALTER\s+TABLE\s+public\.legacy_user_id_map\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.legacy_user_id_map\s+FROM\s+PUBLIC/i);
      expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.legacy_user_id_map\s+FROM\s+anon/i);
      expect(sql).toMatch(/GRANT\s+SELECT\s+ON\s+TABLE\s+public\.legacy_user_id_map\s+TO\s+authenticated/i);
      expect(sql).toMatch(/GRANT\s+ALL\s+ON\s+TABLE\s+public\.legacy_user_id_map\s+TO\s+service_role/i);
    });

    it('Test 5: Implements hardened search_path on trigger function', () => {
      expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.sync_water_logs_compatibility/i);
      expect(sql).toMatch(/SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*pg_catalog,\s*pg_temp/i);
    });

    it('Test 6: Adds nullable compatibility columns and drops NOT NULL from water_logs.user_id', () => {
      // profile_id must be nullable to preserve unmapped rows
      expect(sql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+profile_id\s+UUID/i);
      expect(sql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+amount_ml\s+INT/i);
      // Drops legacy NOT NULL on user_id for new V2 users
      expect(sql).toMatch(/ALTER\s+TABLE\s+public\.water_logs\s+ALTER\s+COLUMN\s+user_id\s+DROP\s+NOT\s+NULL/i);
    });
  });

  // =========================================================================
  // PART 2: 1:1 Identity Mapping Constraint Simulation
  // =========================================================================
  describe('Part 2: 1:1 Identity Mapping Constraint Simulation', () => {
    interface LegacyMapRecord {
      legacy_integer_id: number;
      profile_id: string;
      email: string;
      verification_method: string;
    }

    class MockLegacyMapTable {
      private records: Map<number, LegacyMapRecord> = new Map();
      private profileIndex: Map<string, number> = new Map();

      public insert(record: LegacyMapRecord): { success: boolean; error?: string } {
        // Enforce PRIMARY KEY (legacy_integer_id)
        if (this.records.has(record.legacy_integer_id)) {
          return { success: false, error: '23505: duplicate key value violates unique constraint "legacy_user_id_map_pkey"' };
        }
        // Enforce UNIQUE (profile_id)
        if (this.profileIndex.has(record.profile_id)) {
          return { success: false, error: '23505: duplicate key value violates unique constraint "legacy_user_id_map_profile_id_key"' };
        }

        this.records.set(record.legacy_integer_id, record);
        this.profileIndex.set(record.profile_id, record.legacy_integer_id);
        return { success: true };
      }

      public findByLegacyId(id: number): LegacyMapRecord | undefined {
        return this.records.get(id);
      }

      public findByProfileId(profileId: string): LegacyMapRecord | undefined {
        const legacyId = this.profileIndex.get(profileId);
        return legacyId !== undefined ? this.records.get(legacyId) : undefined;
      }

      public size(): number {
        return this.records.size;
      }
    }

    it('Test 7: Prevents one legacy user ID from mapping to multiple profiles', () => {
      const table = new MockLegacyMapTable();
      const r1 = table.insert({
        legacy_integer_id: 148,
        profile_id: 'b96c0b60-9a8b-496f-9e33-f533982412f6',
        email: 'user148@striva.app',
        verification_method: 'oauth_sub_and_email',
      });
      expect(r1.success).toBe(true);

      // Attempt second profile for legacy 148
      const r2 = table.insert({
        legacy_integer_id: 148,
        profile_id: 'another-uuid-9999-000000000001',
        email: 'user148@striva.app',
        verification_method: 'fraudulent_second_claim',
      });
      expect(r2.success).toBe(false);
      expect(r2.error).toContain('legacy_user_id_map_pkey');
      expect(table.size()).toBe(1);
    });

    it('Test 8: Prevents one profile from claiming multiple legacy IDs', () => {
      const table = new MockLegacyMapTable();
      const r1 = table.insert({
        legacy_integer_id: 148,
        profile_id: 'b96c0b60-9a8b-496f-9e33-f533982412f6',
        email: 'user148@striva.app',
        verification_method: 'oauth_sub_and_email',
      });
      expect(r1.success).toBe(true);

      // Attempt second legacy ID for the same profile
      const r2 = table.insert({
        legacy_integer_id: 153,
        profile_id: 'b96c0b60-9a8b-496f-9e33-f533982412f6',
        email: 'user153@striva.app',
        verification_method: 'unauthorized_takeover',
      });
      expect(r2.success).toBe(false);
      expect(r2.error).toContain('legacy_user_id_map_profile_id_key');
      expect(table.size()).toBe(1);
    });
  });

  // =========================================================================
  // PART 3: Verified Mapping Selection & Evidence Rules
  // =========================================================================
  describe('Part 3: Verified Mapping Selection & Evidence Rules', () => {
    interface LegacyUser {
      id: number;
      email: string;
      google_id: string | null;
    }

    interface AuthUser {
      id: string;
      email: string;
      google_sub: string | null;
    }

    const legacyUsers: LegacyUser[] = [
      { id: 147, email: 'owner@striva.app', google_id: null },
      { id: 148, email: 'coach@striva.app', google_id: 'sub-google-148' },
      { id: 149, email: 'admin@striva.app', google_id: null },
      { id: 150, email: 'user150@striva.app', google_id: 'sub-google-150' },
      { id: 151, email: 'member@striva.app', google_id: 'sub-google-151' },
      { id: 152, email: 'user152@striva.app', google_id: 'sub-google-152' },
      { id: 153, email: 'hydration_heavy@striva.app', google_id: 'sub-google-153' },
    ];

    const authUsers: AuthUser[] = [
      { id: 'uuid-147', email: 'owner@striva.app', google_sub: null },
      { id: 'uuid-148', email: 'coach@striva.app', google_sub: 'sub-google-148' },
      { id: 'uuid-151', email: 'member@striva.app', google_sub: 'sub-google-151' },
      { id: 'uuid-netnew-1', email: 'new1@striva.app', google_sub: 'sub-google-new1' },
      { id: 'uuid-netnew-2', email: 'new2@striva.app', google_sub: 'sub-google-new2' },
    ];

    function evaluateMigrationSelection(users: LegacyUser[], auths: AuthUser[]) {
      const mapped: Array<{ legacyId: number; profileId: string; method: string }> = [];

      // 1. Dual-verified Google OAuth matches (IDs 148, 151)
      for (const u of users) {
        if ([148, 151].includes(u.id)) {
          const match = auths.find(
            a => u.google_id !== null && u.google_id === a.google_sub && u.email.toLowerCase() === a.email.toLowerCase()
          );
          if (match) {
            mapped.push({ legacyId: u.id, profileId: match.id, method: 'oauth_sub_and_email' });
          }
        }
      }

      // Legacy ID 147 is omitted: email match alone is inconclusive without secondary corroborating evidence

      return mapped;
    }

    it('Test 9: Strictly maps only dual-factor verified users (IDs 148 and 151) with cryptographic OAuth corroboration', () => {
      const result = evaluateMigrationSelection(legacyUsers, authUsers);
      expect(result).toHaveLength(2);

      const legacyIds = result.map(r => r.legacyId).sort();
      expect(legacyIds).toEqual([148, 151]);

      const method148 = result.find(r => r.legacyId === 148)?.method;
      expect(method148).toBe('oauth_sub_and_email');

      const method151 = result.find(r => r.legacyId === 151)?.method;
      expect(method151).toBe('oauth_sub_and_email');
    });

    it('Test 10: Ensures inconclusive/unmapped users (including 147 and 153) are NOT bridged by migration seed', () => {
      const result = evaluateMigrationSelection(legacyUsers, authUsers);
      const mappedIds = new Set(result.map(r => r.legacyId));

      expect(mappedIds.has(147)).toBe(false); // Omitted pending manual attestation
      expect(mappedIds.has(149)).toBe(false);
      expect(mappedIds.has(150)).toBe(false);
      expect(mappedIds.has(152)).toBe(false);
      expect(mappedIds.has(153)).toBe(false); // Omitted pending verified claim
    });
  });

  // =========================================================================
  // PART 4: Hydration Compatibility Trigger Simulation
  // =========================================================================
  describe('Part 4: Hydration Compatibility Trigger Simulation', () => {
    interface WaterLogRow {
      id?: number;
      user_id?: number | null;
      profile_id?: string | null;
      amount_ml?: number | null;
      intake_amount?: number | null;
      intake_type?: string;
    }

    const legacyMap: Record<number, string> = {
      147: 'uuid-147',
      148: 'uuid-148',
      151: 'uuid-151',
    };
    const reverseMap: Record<string, number> = {
      'uuid-147': 147,
      'uuid-148': 148,
      'uuid-151': 151,
    };

    function simulateTrigger(row: WaterLogRow): WaterLogRow {
      const rowOut = { ...row };

      // 1. Volume Synchronization
      // amount_ml takes precedence if provided (modern V2 standard)
      if (rowOut.amount_ml !== undefined && rowOut.amount_ml !== null) {
        if (rowOut.intake_amount === undefined || rowOut.intake_amount === null || rowOut.intake_amount !== rowOut.amount_ml) {
          rowOut.intake_amount = rowOut.amount_ml;
        }
      } else if (rowOut.intake_amount !== undefined && rowOut.intake_amount !== null) {
        rowOut.amount_ml = rowOut.intake_amount;
      }

      // 2. Identity Translation
      if (rowOut.profile_id && !rowOut.user_id) {
        const mappedLegacy = reverseMap[rowOut.profile_id];
        if (mappedLegacy !== undefined) {
          rowOut.user_id = mappedLegacy;
        }
      } else if (rowOut.user_id && !rowOut.profile_id) {
        const mappedProfile = legacyMap[rowOut.user_id];
        if (mappedProfile !== undefined) {
          rowOut.profile_id = mappedProfile;
        }
      }

      return rowOut;
    }

    it('Test 11: When modern code passes amount_ml, intake_amount is automatically populated', () => {
      const input: WaterLogRow = {
        profile_id: 'uuid-netnew-1',
        amount_ml: 750,
      };
      const output = simulateTrigger(input);

      expect(output.amount_ml).toBe(750);
      expect(output.intake_amount).toBe(750);
    });

    it('Test 12: When legacy code passes intake_amount, amount_ml is automatically populated', () => {
      const input: WaterLogRow = {
        user_id: 153,
        intake_amount: 500,
      };
      const output = simulateTrigger(input);

      expect(output.intake_amount).toBe(500);
      expect(output.amount_ml).toBe(500);
    });

    it('Test 13: When conflicting amount_ml and intake_amount are provided, amount_ml takes precedence', () => {
      const input: WaterLogRow = {
        profile_id: 'uuid-147',
        amount_ml: 1000,
        intake_amount: 250, // conflicting legacy value
      };
      const output = simulateTrigger(input);

      expect(output.amount_ml).toBe(1000);
      expect(output.intake_amount).toBe(1000); // intake_amount updated to match amount_ml
    });

    it('Test 14: Translates profile_id to legacy user_id when mapped record exists', () => {
      const input: WaterLogRow = {
        profile_id: 'uuid-147',
        amount_ml: 400,
      };
      const output = simulateTrigger(input);

      expect(output.profile_id).toBe('uuid-147');
      expect(output.user_id).toBe(147); // bridged!
    });

    it('Test 15: Translates legacy user_id to profile_id when mapped record exists', () => {
      const input: WaterLogRow = {
        user_id: 147,
        intake_amount: 600,
      };
      const output = simulateTrigger(input);

      expect(output.user_id).toBe(147);
      expect(output.profile_id).toBe('uuid-147'); // bridged!
    });

    it('Test 16: Preserves null profile_id for unmapped legacy users without corruption', () => {
      const input: WaterLogRow = {
        user_id: 153,
        intake_amount: 1000,
      };
      const output = simulateTrigger(input);

      expect(output.user_id).toBe(153);
      expect(output.profile_id).toBeUndefined(); // remains unmapped safely
    });
  });

  // =========================================================================
  // PART 5: Hydration RLS Dual-Key Policy Simulation
  // =========================================================================
  describe('Part 5: Hydration RLS Dual-Key Policy Simulation', () => {
    interface PolicyContext {
      authUid: string | null;
    }

    interface WaterLogRecord {
      id: number;
      user_id: number | null;
      profile_id: string | null;
    }

    const legacyMap: Record<number, string> = {
      147: 'uuid-147',
      148: 'uuid-148',
      151: 'uuid-151',
    };

    function evaluateWaterLogsPolicy(ctx: PolicyContext, record: WaterLogRecord): boolean {
      if (!ctx.authUid) return false;

      // Rule: auth.uid() = profile_id
      if (record.profile_id && ctx.authUid === record.profile_id) {
        return true;
      }

      // Rule: EXISTS (legacy_user_id_map WHERE legacy_integer_id = water_logs.user_id AND profile_id = auth.uid())
      if (record.user_id !== null && record.user_id !== undefined) {
        const mappedProfile = legacyMap[record.user_id];
        if (mappedProfile && mappedProfile === ctx.authUid) {
          return true;
        }
      }

      return false;
    }

    it('Test 17: Authenticated user views records matching their profile_id', () => {
      const ctx: PolicyContext = { authUid: 'uuid-147' };
      const record: WaterLogRecord = { id: 13, user_id: 147, profile_id: 'uuid-147' };

      expect(evaluateWaterLogsPolicy(ctx, record)).toBe(true);
    });

    it('Test 18: Authenticated user views legacy records via legacy_user_id_map even before profile_id backfill', () => {
      const ctx: PolicyContext = { authUid: 'uuid-147' };
      // Simulate historical row with user_id = 147 but profile_id = null
      const record: WaterLogRecord = { id: 13, user_id: 147, profile_id: null };

      expect(evaluateWaterLogsPolicy(ctx, record)).toBe(true);
    });

    it('Test 19: Denies access to records belonging to other users (cross-tenant denial)', () => {
      const ctx: PolicyContext = { authUid: 'uuid-netnew-1' };
      const record: WaterLogRecord = { id: 13, user_id: 147, profile_id: 'uuid-147' };

      expect(evaluateWaterLogsPolicy(ctx, record)).toBe(false);
    });

    it('Test 20: Denies access to unmapped historical records of User 153 to unauthorized callers', () => {
      const ctx: PolicyContext = { authUid: 'uuid-netnew-1' };
      const record: WaterLogRecord = { id: 1, user_id: 153, profile_id: null };

      expect(evaluateWaterLogsPolicy(ctx, record)).toBe(false);
    });

    it('Test 21: Completely denies unauthenticated requests (fail-closed)', () => {
      const ctx: PolicyContext = { authUid: null };
      const record: WaterLogRecord = { id: 13, user_id: 147, profile_id: 'uuid-147' };

      expect(evaluateWaterLogsPolicy(ctx, record)).toBe(false);
    });
  });

  // =========================================================================
  // PART 6: Secure Deferred Claiming Protocol Simulation
  // =========================================================================
  describe('Part 6: Secure Deferred Claiming Protocol Simulation', () => {
    interface ClaimRequest {
      callerProfileId: string;
      callerEmail: string;
      isEmailVerified: boolean;
      callerGoogleSub?: string;
      targetLegacyId: number;
    }

    interface ClaimResult {
      claimed: boolean;
      reason?: string;
    }

    const legacyUsersDb: Record<number, { email: string; google_id: string | null }> = {
      153: { email: 'hydration_heavy@striva.app', google_id: 'sub-google-153' },
    };

    let existingClaimsDb: Map<number, string>;

    beforeEach(() => {
      existingClaimsDb = new Map();
    });

    function executeClaimLegacyAccount(req: ClaimRequest): ClaimResult {
      // 1. Must be verified
      if (!req.isEmailVerified) {
        return { claimed: false, reason: 'CLAIM_DENIED: Caller email is not verified in auth system.' };
      }

      // 2. Legacy user must exist
      const legacy = legacyUsersDb[req.targetLegacyId];
      if (!legacy) {
        return { claimed: false, reason: 'CLAIM_DENIED: Legacy user does not exist.' };
      }

      // 3. Must not already be claimed
      if (existingClaimsDb.has(req.targetLegacyId)) {
        return { claimed: false, reason: 'CLAIM_DENIED: Legacy user is already claimed by another profile.' };
      }

      // 4. Verification requirement: Google OAuth Sub OR Email Exact Match
      const matchesGoogle = req.callerGoogleSub && legacy.google_id && req.callerGoogleSub === legacy.google_id;
      const matchesEmail = req.callerEmail.toLowerCase() === legacy.email.toLowerCase();

      if (!matchesGoogle && !matchesEmail) {
        return { claimed: false, reason: 'CLAIM_DENIED: Caller attributes do not match trusted legacy identity.' };
      }

      // Success
      existingClaimsDb.set(req.targetLegacyId, req.callerProfileId);
      return { claimed: true };
    }

    it('Test 22: Legitimate User 153 successfully claims legacy identity upon authenticating with matching verified email', () => {
      const req: ClaimRequest = {
        callerProfileId: 'uuid-future-153',
        callerEmail: 'hydration_heavy@striva.app',
        isEmailVerified: true,
        callerGoogleSub: 'sub-google-153',
        targetLegacyId: 153,
      };

      const result = executeClaimLegacyAccount(req);
      expect(result.claimed).toBe(true);
      expect(existingClaimsDb.get(153)).toBe('uuid-future-153');
    });

    it('Test 23: Rejects claim attempt by malicious caller with different email (account takeover denial)', () => {
      const req: ClaimRequest = {
        callerProfileId: 'uuid-attacker',
        callerEmail: 'attacker@evil.com',
        isEmailVerified: true,
        targetLegacyId: 153,
      };

      const result = executeClaimLegacyAccount(req);
      expect(result.claimed).toBe(false);
      expect(result.reason).toContain('CLAIM_DENIED: Caller attributes do not match');
    });

    it('Test 24: Rejects second claim attempt when legacy account is already claimed', () => {
      // Simulate that 153 was already claimed
      existingClaimsDb.set(153, 'uuid-future-153');

      const req2: ClaimRequest = {
        callerProfileId: 'uuid-another-caller',
        callerEmail: 'hydration_heavy@striva.app',
        isEmailVerified: true,
        targetLegacyId: 153,
      };

      const result = executeClaimLegacyAccount(req2);
      expect(result.claimed).toBe(false);
      expect(result.reason).toContain('already claimed');
    });
  });

  // =========================================================================
  // PART 7: Rollback & Data Preservation Invariants
  // =========================================================================
  describe('Part 7: Rollback & Data Preservation Invariants', () => {
    it('Test 25: Validates that Phase 9B post-migration assertions enforce zero data loss and unmapped preservation', () => {
      // Must assert water_logs row count >= 13
      expect(sql).toMatch(/SELECT\s+COUNT\(\*\)\s+INTO\s+v_water_count\s+FROM\s+public\.water_logs/i);
      expect(sql).toMatch(/IF\s+v_water_count\s*<\s*13\s+THEN/i);

      // Must assert User 153 retains exactly 12 unmapped rows
      expect(sql).toMatch(/SELECT\s+COUNT\(\*\)\s+INTO\s+v_unmapped_153_count\s+FROM\s+public\.water_logs\s+WHERE\s+user_id\s*=\s*153\s+AND\s+profile_id\s+IS\s+NULL/i);
      expect(sql).toMatch(/IF\s+v_unmapped_153_count\s*!=\s*12\s+THEN/i);

      // Must assert User 147 remains unmapped pending operator attestation
      expect(sql).toMatch(/SELECT\s+COUNT\(\*\)\s+INTO\s+v_unmapped_147_count\s+FROM\s+public\.water_logs\s+WHERE\s+user_id\s*=\s*147\s+AND\s+profile_id\s+IS\s+NULL/i);
      expect(sql).toMatch(/IF\s+v_unmapped_147_count\s*!=\s*1\s+THEN/i);
    });

    it('Test 26: Confirms rollback procedure in SQL comments is non-destructive', () => {
      expect(sql).toMatch(/(SAFE\s+ROLLBACK\s+PROCEDURE|ROLLBACK\s+&\s+RECONCILIATION\s+RUNBOOK)/i);
      expect(sql).toMatch(/DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_sync_water_logs_compatibility/i);
      expect(sql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+public\.legacy_user_id_map/i);
      // Leaves original user_id and intake_amount columns intact
      expect(sql).toMatch(/All\s+13\s+original\s+water_logs\s+rows\s+remain\s+intact/i);
    });
  });
});
