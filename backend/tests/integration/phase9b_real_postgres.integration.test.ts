import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * STRIVA V2 — DB-3B: Real PostgreSQL 18 Disposable Validation Suite
 *
 * Target: Ephemeral, isolated local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests execute REAL PostgreSQL queries, DDL, DML,
 * trigger execution, RLS evaluations, and error handling.
 */

const LOCAL_PG_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  database: 'postgres',
};

const MIGRATION_FILE = path.join(__dirname, '../../supabase/migrations/phase_9b_legacy_identity_bridge.sql');
const MIGRATION_SQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');

describe('DB-3B: Real PostgreSQL 18 Identity Bridge Validation Suite', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(LOCAL_PG_CONFIG);
    await client.connect();

    // Verify local PostgreSQL version
    const versionRes = await client.query('SELECT version()');
    expect(versionRes.rows[0].version).toContain('PostgreSQL 18');

    // Setup Supabase-compatible roles & schemas
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$ LANGUAGE sql STABLE;

      GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
    `);

    // Reset public schema to clean representative state
    await client.query(`
      DROP TABLE IF EXISTS public.legacy_user_id_map CASCADE;
      DROP TABLE IF EXISTS public.water_logs CASCADE;
      DROP TABLE IF EXISTS public.profiles CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;
      DROP TABLE IF EXISTS auth.users CASCADE;

      CREATE TABLE auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE public.users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR,
        name VARCHAR,
        email VARCHAR UNIQUE NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        full_name TEXT,
        organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.water_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        intake_amount INT NOT NULL,
        intake_type VARCHAR DEFAULT 'water',
        source VARCHAR DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Seed exact representative test dataset from staging audit
    await client.query(`
      -- 1. auth.users (5 accounts)
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'user148@striva.app', '{"sub": "101315497550140981399"}'::jsonb),
        ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'user151@striva.app', '{"sub": "104636286967743040898"}'::jsonb),
        ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'user147@striva.app', '{}'::jsonb),
        ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'netnew1@striva.app', '{"sub": "sub-new-1"}'::jsonb),
        ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'netnew2@striva.app', '{"sub": "sub-new-2"}'::jsonb);

      -- 2. public.profiles (5 profiles)
      INSERT INTO public.profiles (id, email, full_name)
      SELECT id, email, email FROM auth.users;

      -- 3. public.users (7 legacy users: IDs 147 to 153)
      INSERT INTO public.users (id, google_id, name, email, is_admin) VALUES
        (147, NULL, 'User 147', 'user147@striva.app', false),
        (148, '101315497550140981399', 'User 148', 'user148@striva.app', false),
        (149, NULL, 'Admin 149', 'admin149@striva.app', true),
        (150, 'sub-legacy-150', 'User 150', 'user150@striva.app', false),
        (151, '104636286967743040898', 'User 151', 'user151@striva.app', false),
        (152, 'sub-legacy-152', 'User 152', 'user152@striva.app', false),
        (153, 'sub-legacy-153', 'User 153', 'user153@striva.app', false);
      ALTER SEQUENCE public.users_id_seq RESTART WITH 154;

      -- 4. public.water_logs (13 rows: 1 for user 147; 12 for user 153)
      INSERT INTO public.water_logs (id, user_id, intake_amount) VALUES
        (1, 153, 250),
        (2, 153, 350),
        (3, 153, 400),
        (4, 153, 1000),
        (5, 153, 750),
        (6, 153, 500),
        (7, 153, 250),
        (8, 153, 1000),
        (9, 153, 1000),
        (10, 153, 1000),
        (11, 153, 1000),
        (12, 153, 1000),
        (13, 147, 1000);
      ALTER SEQUENCE public.water_logs_id_seq RESTART WITH 14;
    `);
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // =========================================================================
  // SECTION 1: Migration Execution & Evidence Verification
  // =========================================================================
  describe('Section 1: Migration Execution & Evidence Verification', () => {
    it('applies phase_9b_legacy_identity_bridge.sql successfully without errors', async () => {
      await client.query('BEGIN');
      try {
        await client.query(MIGRATION_SQL);
        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed: ${err.message}`);
      }

      // Verify mapping table exists
      const tableCheck = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'legacy_user_id_map'
      `);
      expect(parseInt(tableCheck.rows[0].count, 10)).toBe(1);
    });

    it('seeds ONLY dual-factor verified mappings (IDs 148 and 151); omits ID 147', async () => {
      const mapRes = await client.query('SELECT legacy_integer_id, profile_id, verification_method FROM public.legacy_user_id_map ORDER BY legacy_integer_id');
      expect(mapRes.rows).toHaveLength(2);

      expect(mapRes.rows[0]).toEqual({
        legacy_integer_id: 148,
        profile_id: 'b96c0b60-9a8b-496f-9e33-f533982412f6',
        verification_method: 'oauth_sub_and_email',
      });

      expect(mapRes.rows[1]).toEqual({
        legacy_integer_id: 151,
        profile_id: '2dbbad1d-5988-4d6f-8c32-5c57080e56f5',
        verification_method: 'oauth_sub_and_email',
      });

      // User 147 must NOT be in mapping table
      const user147Map = await client.query('SELECT * FROM public.legacy_user_id_map WHERE legacy_integer_id = 147');
      expect(user147Map.rows).toHaveLength(0);

      // User 153 must NOT be in mapping table
      const user153Map = await client.query('SELECT * FROM public.legacy_user_id_map WHERE legacy_integer_id = 153');
      expect(user153Map.rows).toHaveLength(0);
    });

    it('preserves all 13 historical water logs; backfills amount_ml across all 13 rows', async () => {
      const waterRes = await client.query('SELECT COUNT(*) as count FROM public.water_logs');
      expect(parseInt(waterRes.rows[0].count, 10)).toBe(13);

      const nullAmountRes = await client.query('SELECT COUNT(*) as count FROM public.water_logs WHERE amount_ml IS NULL');
      expect(parseInt(nullAmountRes.rows[0].count, 10)).toBe(0);

      // User 153 has all 12 rows intact with profile_id = null
      const u153Res = await client.query('SELECT COUNT(*) as count FROM public.water_logs WHERE user_id = 153 AND profile_id IS NULL');
      expect(parseInt(u153Res.rows[0].count, 10)).toBe(12);

      // User 147 has 1 row intact with profile_id = null (unmapped pending attestation)
      const u147Res = await client.query('SELECT COUNT(*) as count FROM public.water_logs WHERE user_id = 147 AND profile_id IS NULL');
      expect(parseInt(u147Res.rows[0].count, 10)).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 2: Real Trigger Behavior Validation (sync_water_logs_compatibility)
  // =========================================================================
  describe('Section 2: Real Trigger Behavior Validation', () => {
    it('Case 1: INSERT with only intake_amount mirrors to amount_ml', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (intake_amount) VALUES (350) RETURNING intake_amount, amount_ml
      `);
      expect(res.rows[0].intake_amount).toBe(350);
      expect(res.rows[0].amount_ml).toBe(350);
    });

    it('Case 2: INSERT with only amount_ml mirrors to intake_amount', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (amount_ml) VALUES (500) RETURNING intake_amount, amount_ml
      `);
      expect(res.rows[0].intake_amount).toBe(500);
      expect(res.rows[0].amount_ml).toBe(500);
    });

    it('Case 3: INSERT with matching amount_ml and intake_amount retains value', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (amount_ml, intake_amount) VALUES (750, 750) RETURNING intake_amount, amount_ml
      `);
      expect(res.rows[0].intake_amount).toBe(750);
      expect(res.rows[0].amount_ml).toBe(750);
    });

    it('Case 4: INSERT with conflicting values gives amount_ml precedence', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (amount_ml, intake_amount) VALUES (1000, 250) RETURNING intake_amount, amount_ml
      `);
      expect(res.rows[0].amount_ml).toBe(1000);
      expect(res.rows[0].intake_amount).toBe(1000); // intake_amount updated to match canonical amount_ml
    });

    it('Case 5: UPDATE changing only intake_amount mirrors to amount_ml', async () => {
      const insert = await client.query('INSERT INTO public.water_logs (amount_ml) VALUES (400) RETURNING id');
      const id = insert.rows[0].id;

      const updated = await client.query('UPDATE public.water_logs SET intake_amount = 600 WHERE id = $1 RETURNING intake_amount, amount_ml', [id]);
      expect(updated.rows[0].intake_amount).toBe(600);
      expect(updated.rows[0].amount_ml).toBe(600);
    });

    it('Case 6: UPDATE changing only amount_ml mirrors to intake_amount', async () => {
      const insert = await client.query('INSERT INTO public.water_logs (amount_ml) VALUES (400) RETURNING id');
      const id = insert.rows[0].id;

      const updated = await client.query('UPDATE public.water_logs SET amount_ml = 800 WHERE id = $1 RETURNING intake_amount, amount_ml', [id]);
      expect(updated.rows[0].amount_ml).toBe(800);
      expect(updated.rows[0].intake_amount).toBe(800);
    });

    it('Case 7: UPDATE changing both to conflicting values gives amount_ml precedence', async () => {
      const insert = await client.query('INSERT INTO public.water_logs (amount_ml) VALUES (400) RETURNING id');
      const id = insert.rows[0].id;

      const updated = await client.query('UPDATE public.water_logs SET amount_ml = 900, intake_amount = 300 WHERE id = $1 RETURNING intake_amount, amount_ml', [id]);
      expect(updated.rows[0].amount_ml).toBe(900);
      expect(updated.rows[0].intake_amount).toBe(900);
    });

    it('Case 8: Rejects non-positive or NULL hydration volumes', async () => {
      await expect(client.query('INSERT INTO public.water_logs (amount_ml) VALUES (-100)')).rejects.toThrow('volume must be strictly positive');
      await expect(client.query('INSERT INTO public.water_logs (amount_ml) VALUES (0)')).rejects.toThrow('volume must be strictly positive');
      await expect(client.query('INSERT INTO public.water_logs (intake_type) VALUES (\'water\')')).rejects.toThrow('either amount_ml or intake_amount must be provided');
    });

    it('Case 9: Automatically translates profile_id to user_id for mapped users', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (profile_id, amount_ml)
        VALUES ('b96c0b60-9a8b-496f-9e33-f533982412f6', 250)
        RETURNING user_id, profile_id
      `);
      expect(res.rows[0].user_id).toBe(148);
      expect(res.rows[0].profile_id).toBe('b96c0b60-9a8b-496f-9e33-f533982412f6');
    });

    it('Case 10: Automatically translates legacy user_id to profile_id for mapped users', async () => {
      const res = await client.query(`
        INSERT INTO public.water_logs (user_id, amount_ml)
        VALUES (148, 300)
        RETURNING user_id, profile_id
      `);
      expect(res.rows[0].user_id).toBe(148);
      expect(res.rows[0].profile_id).toBe('b96c0b60-9a8b-496f-9e33-f533982412f6');
    });
  });

  // =========================================================================
  // SECTION 3: Real PostgreSQL RLS & Tenant Isolation
  // =========================================================================
  describe('Section 3: Real PostgreSQL RLS & Tenant Isolation', () => {
    it('enforces RLS under authenticated role: members manage own logs, denied on others', async () => {
      await client.query('BEGIN');
      try {
        // Set local role to authenticated
        await client.query('SET LOCAL ROLE authenticated');

        // User A (uuid-148) queries water_logs
        await client.query('SET LOCAL request.jwt.claim.sub = \'b96c0b60-9a8b-496f-9e33-f533982412f6\'');
        
        // Insert log as User A
        const insertA = await client.query(`
          INSERT INTO public.water_logs (profile_id, amount_ml)
          VALUES ('b96c0b60-9a8b-496f-9e33-f533982412f6', 500)
          RETURNING id
        `);
        const idA = insertA.rows[0].id;

        // User A can view their own log
        const selectA = await client.query('SELECT id FROM public.water_logs WHERE id = $1', [idA]);
        expect(selectA.rows).toHaveLength(1);

        // Switch to User B (uuid-151)
        await client.query('SET LOCAL request.jwt.claim.sub = \'2dbbad1d-5988-4d6f-8c32-5c57080e56f5\'');

        // User B CANNOT see User A's log (RLS denial)
        const selectB = await client.query('SELECT id FROM public.water_logs WHERE id = $1', [idA]);
        expect(selectB.rows).toHaveLength(0);

        // User B cannot UPDATE User A's log
        const updateB = await client.query('UPDATE public.water_logs SET amount_ml = 999 WHERE id = $1 RETURNING id', [idA]);
        expect(updateB.rows).toHaveLength(0);

        // User B cannot DELETE User A's log
        const deleteB = await client.query('DELETE FROM public.water_logs WHERE id = $1 RETURNING id', [idA]);
        expect(deleteB.rows).toHaveLength(0);

        // Reset role
        await client.query('RESET ROLE');
      } finally {
        await client.query('ROLLBACK');
      }
    });

    it('allows mapped legacy user to access historical logs via legacy_user_id_map bridge policy', async () => {
      await client.query('BEGIN');
      try {
        // Insert a historical legacy log for User 148 with profile_id NULL
        // Note: we temporarily disable the trigger to simulate an ancient unbackfilled legacy row
        await client.query('ALTER TABLE public.water_logs DISABLE TRIGGER trg_sync_water_logs_compatibility');
        const legacyLog = await client.query(`
          INSERT INTO public.water_logs (user_id, intake_amount, amount_ml, profile_id)
          VALUES (148, 650, 650, NULL)
          RETURNING id
        `);
        const legacyLogId = legacyLog.rows[0].id;
        await client.query('ALTER TABLE public.water_logs ENABLE TRIGGER trg_sync_water_logs_compatibility');

        // Authenticate as mapped User 148 (uuid-148)
        await client.query('SET LOCAL ROLE authenticated');
        await client.query('SET LOCAL request.jwt.claim.sub = \'b96c0b60-9a8b-496f-9e33-f533982412f6\'');

        // User 148 CAN see their legacy row even though profile_id is NULL, because legacy_user_id_map bridges it
        const selRes = await client.query('SELECT id, user_id, amount_ml FROM public.water_logs WHERE id = $1', [legacyLogId]);
        expect(selRes.rows).toHaveLength(1);
        expect(selRes.rows[0].amount_ml).toBe(650);

        // Switch to User B (uuid-151)
        await client.query('SET LOCAL request.jwt.claim.sub = \'2dbbad1d-5988-4d6f-8c32-5c57080e56f5\'');

        // User B CANNOT see User 148's legacy row
        const selResB = await client.query('SELECT id FROM public.water_logs WHERE id = $1', [legacyLogId]);
        expect(selResB.rows).toHaveLength(0);

        await client.query('RESET ROLE');
      } finally {
        await client.query('ROLLBACK');
      }
    });

    it('ensures unmapped historical logs (e.g. User 153, User 147) remain completely invisible to all authenticated users', async () => {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        // Test as User 148
        await client.query('SET LOCAL request.jwt.claim.sub = \'b96c0b60-9a8b-496f-9e33-f533982412f6\'');

        // User 148 queries User 153's 12 rows
        const u153Rows = await client.query('SELECT id FROM public.water_logs WHERE user_id = 153');
        expect(u153Rows.rows).toHaveLength(0);

        // User 148 queries User 147's row
        const u147Rows = await client.query('SELECT id FROM public.water_logs WHERE user_id = 147');
        expect(u147Rows.rows).toHaveLength(0);

        // Test as Net New User 1
        await client.query('SET LOCAL request.jwt.claim.sub = \'2d27bc46-7744-49ca-aaac-7bd3ade86224\'');
        const netNewRows = await client.query('SELECT id FROM public.water_logs WHERE user_id IN (147, 153)');
        expect(netNewRows.rows).toHaveLength(0);

        await client.query('RESET ROLE');
      } finally {
        await client.query('ROLLBACK');
      }
    });

    it('allows service_role privileged operations to view all records (bypassing user filter via service_role policy)', async () => {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE service_role');

        const allRows = await client.query('SELECT COUNT(*) as count FROM public.water_logs');
        expect(parseInt(allRows.rows[0].count, 10)).toBeGreaterThanOrEqual(13);

        await client.query('RESET ROLE');
      } finally {
        await client.query('ROLLBACK');
      }
    });

    it('denies unauthenticated requests completely (fail-closed)', async () => {
      // Test anon SELECT
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE anon');
        await expect(client.query('SELECT * FROM public.water_logs LIMIT 1')).rejects.toThrow('permission denied');
      } finally {
        await client.query('ROLLBACK');
      }

      // Test anon INSERT
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE anon');
        await expect(client.query('INSERT INTO public.water_logs (amount_ml) VALUES (500)')).rejects.toThrow('permission denied');
      } finally {
        await client.query('ROLLBACK');
      }
    });
  });

  // =========================================================================
  // SECTION 4: Transaction Atomicity & Failure Rollback
  // =========================================================================
  describe('Section 4: Transaction Atomicity & Failure Rollback', () => {
    it('verifies that a failed migration transaction leaves no partial schema or data changes', async () => {
      // Create a dummy table to test transaction boundary
      await client.query('CREATE TABLE IF NOT EXISTS public._tx_canary (id INT PRIMARY KEY, val TEXT)');
      await client.query('INSERT INTO public._tx_canary (id, val) VALUES (1, \'original\') ON CONFLICT DO NOTHING');

      // Execute a transaction that performs DDL/DML and deliberately fails at an assertion
      let errorThrown = false;
      await client.query('BEGIN');
      try {
        await client.query('ALTER TABLE public._tx_canary ADD COLUMN canary_col INT');
        await client.query('UPDATE public._tx_canary SET val = \'modified\' WHERE id = 1');
        // Deliberate failure:
        await client.query('SELECT 1 / 0');
        await client.query('COMMIT');
      } catch (err) {
        errorThrown = true;
        await client.query('ROLLBACK');
      }

      expect(errorThrown).toBe(true);

      // Verify the canary table has NO canary_col and val remains 'original'
      const checkCol = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '_tx_canary' AND column_name = 'canary_col'
      `);
      expect(checkCol.rows).toHaveLength(0);

      const checkVal = await client.query('SELECT val FROM public._tx_canary WHERE id = 1');
      expect(checkVal.rows[0].val).toBe('original');

      await client.query('DROP TABLE IF EXISTS public._tx_canary');
    });
  });

  // =========================================================================
  // SECTION 5: Rollback Behavior & Non-Destructive Invariant
  // =========================================================================
  describe('Section 5: Rollback Behavior & Non-Destructive Invariant', () => {
    it('demonstrates non-destructive rollback of compatibility columns while preserving 13 legacy rows and archiving modern V2 rows', async () => {
      await client.query('BEGIN');
      try {
        // Insert a modern post-migration V2 log where user_id IS NULL (e.g. unmapped net new user)
        const netNewLog = await client.query(`
          INSERT INTO public.water_logs (profile_id, amount_ml)
          VALUES ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 850)
          RETURNING id, profile_id, user_id, amount_ml
        `);
        expect(netNewLog.rows[0].user_id).toBeNull();
        expect(netNewLog.rows[0].profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224');

        // Execute the exact Rollback & Reconciliation Runbook procedure:
        // Step 1: Archive post-migration V2 records to prevent data loss
        await client.query(`
          CREATE TABLE public._rollback_v2_water_logs_archive AS
          SELECT * FROM public.water_logs WHERE user_id IS NULL;
        `);

        const archiveCount = await client.query('SELECT COUNT(*) as count FROM public._rollback_v2_water_logs_archive');
        expect(parseInt(archiveCount.rows[0].count, 10)).toBeGreaterThanOrEqual(1);

        // Verify net new user's log is captured in the archive table
        const netNewArchived = await client.query('SELECT * FROM public._rollback_v2_water_logs_archive WHERE id = $1', [netNewLog.rows[0].id]);
        expect(netNewArchived.rows).toHaveLength(1);
        expect(netNewArchived.rows[0].profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224');
        expect(netNewArchived.rows[0].amount_ml).toBe(850);

        // Step 2: Drop trigger and function
        await client.query('DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;');
        await client.query('DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();');

        // Step 3: Drop RLS policies
        await client.query('DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;');
        await client.query('DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;');

        // Step 4: Drop bridge table
        await client.query('DROP TABLE IF EXISTS public.legacy_user_id_map;');

        // Step 5: Drop compatibility columns
        await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id, DROP COLUMN IF EXISTS amount_ml;');

        // Verify all 13 original legacy rows remain intact
        const legacyRows = await client.query('SELECT id, user_id, intake_amount FROM public.water_logs WHERE id <= 13 ORDER BY id');
        expect(legacyRows.rows).toHaveLength(13);
        expect(legacyRows.rows[0].intake_amount).toBe(250);
        expect(legacyRows.rows[12].intake_amount).toBe(1000);

        // Verify modern V2 row is safely preserved in archive table
        const preservedArchivedRow = await client.query('SELECT * FROM public._rollback_v2_water_logs_archive WHERE profile_id = $1', ['2d27bc46-7744-49ca-aaac-7bd3ade86224']);
        expect(preservedArchivedRow.rows).toHaveLength(1);
        expect(preservedArchivedRow.rows[0].profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224');
        expect(preservedArchivedRow.rows[0].amount_ml).toBe(850);

        // Cleanup archive in transaction
        await client.query('DROP TABLE IF EXISTS public._rollback_v2_water_logs_archive');
      } finally {
        await client.query('ROLLBACK');
      }
    });
  });
});
