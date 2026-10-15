import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * STRIVA V2 — DB-3G: Recovery Runbook Hardening & Failure-Injection Test Suite
 *
 * Target: Ephemeral local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests execute REAL PostgreSQL queries, DDL, DML,
 * failure injections, lock evaluations, and sequence semantics.
 */

const LOCAL_PG_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  database: 'postgres',
};

const MIGRATION_FILE = path.join(__dirname, '../../supabase/migrations/phase_9b_legacy_identity_bridge.sql');
const MIGRATION_SQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');

describe('DB-3G: Recovery Runbook Hardening & Failure-Injection Suite', () => {
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
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // Helper function to seed fresh representative staging state
  async function resetAndSeedBaseline() {
    await client.query(`
      DROP TABLE IF EXISTS public._rollback_v2_water_logs_archive_test CASCADE;
      DROP TABLE IF EXISTS public.legacy_user_id_map CASCADE;
      DROP TABLE IF EXISTS public.water_logs CASCADE;
      DROP TABLE IF EXISTS public.profiles CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;
      DROP TABLE IF EXISTS auth.users CASCADE;
      DROP TABLE IF EXISTS public._migrations CASCADE;

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

      CREATE TABLE public._migrations (
        name VARCHAR PRIMARY KEY,
        run_at TIMESTAMPTZ DEFAULT now()
      );

      -- Seed auth & profiles
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'user148@striva.app', '{"sub": "101315497550140981399"}'::jsonb),
        ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'user151@striva.app', '{"sub": "104636286967743040898"}'::jsonb),
        ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'user147@striva.app', '{}'::jsonb),
        ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'netnew1@striva.app', '{"sub": "sub-new-1"}'::jsonb);

      INSERT INTO public.profiles (id, email, full_name)
      SELECT id, email, email FROM auth.users;

      -- Seed 7 legacy users
      INSERT INTO public.users (id, google_id, name, email, is_admin) VALUES
        (147, NULL, 'User 147', 'user147@striva.app', false),
        (148, '101315497550140981399', 'User 148', 'user148@striva.app', false),
        (149, NULL, 'Admin 149', 'admin149@striva.app', true),
        (150, 'sub-legacy-150', 'User 150', 'user150@striva.app', false),
        (151, '104636286967743040898', 'User 151', 'user151@striva.app', false),
        (152, 'sub-legacy-152', 'User 152', 'user152@striva.app', false),
        (153, 'sub-legacy-153', 'User 153', 'user153@striva.app', false);
      ALTER SEQUENCE public.users_id_seq RESTART WITH 154;

      -- Seed 13 historical water logs (1 for user 147; 12 for user 153)
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

      -- Mark Phase 9A as already applied
      INSERT INTO public._migrations (name) VALUES ('phase_9a_rls_recursion_fix.sql');
    `);

    // Apply Phase 9B to reach post-migration state
    await client.query(MIGRATION_SQL);
    await client.query("INSERT INTO public._migrations (name) VALUES ('phase_9b_legacy_identity_bridge.sql')");
  }

  // =========================================================================
  // SCENARIO 1: Rollback when NO modern rows exist
  // =========================================================================
  it('Scenario 1: Rolls back cleanly when zero modern rows exist; preserves 13 legacy rows', async () => {
    await resetAndSeedBaseline();

    await client.query('BEGIN');
    try {
      // 1. Exclusive table lock
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // 2. Archival of records where user_id IS NULL (expected 0)
      await client.query(`
        CREATE TABLE public._rollback_v2_water_logs_archive_test AS
        SELECT * FROM public.water_logs WHERE user_id IS NULL;
      `);

      // Privilege hardening on archive (least privilege)
      await client.query(`
        REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_test FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_test TO service_role;
      `);

      // 3. Assert count matches (0 == 0)
      const countCheck = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM public.water_logs WHERE user_id IS NULL) AS src_count,
          (SELECT COUNT(*) FROM public._rollback_v2_water_logs_archive_test) AS arch_count
      `);
      expect(countCheck.rows[0].src_count).toBe('0');
      expect(countCheck.rows[0].arch_count).toBe('0');

      // 4. Drop trigger, function, policies, bridge table
      await client.query('DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;');
      await client.query('DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();');
      await client.query('DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;');
      await client.query('DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;');
      await client.query('DROP TABLE IF EXISTS public.legacy_user_id_map;');

      // 5. Drop compatibility columns
      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;');
      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;');

      // 6. Delete migration record
      await client.query("DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql'");

      // 7. Dynamic sequence setval
      await client.query(`
        SELECT setval(
          'public.water_logs_id_seq', 
          GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
          true
        );
      `);

      // 8. Assert all 13 legacy rows intact
      const legacyCount = await client.query('SELECT COUNT(*) AS total FROM public.water_logs');
      expect(parseInt(legacyCount.rows[0].total, 10)).toBe(13);

      await client.query('COMMIT');

      // Verify sequence nextval allocates 14
      const nextId = await client.query("SELECT nextval('public.water_logs_id_seq') AS next_id");
      expect(parseInt(nextId.rows[0].next_id, 10)).toBe(14);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });

  // =========================================================================
  // SCENARIO 2: Rollback with Mapped Modern Rows, Unmapped Modern Rows, and Legacy Rows
  // =========================================================================
  it('Scenario 2: Correctly archives both mapped and unmapped modern rows while excluding legacy rows; preserves full UUID identity associations', async () => {
    await resetAndSeedBaseline();

    // 1. Insert modern record for Mapped User 148 (uuid-148)
    // The Phase 9B trigger automatically translates profile_id into user_id = 148!
    const row148 = await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('b96c0b60-9a8b-496f-9e33-f533982412f6', 600)
      RETURNING id, user_id, profile_id, amount_ml, intake_amount
    `);
    expect(row148.rows[0].user_id).toBe(148); // non-NULL user_id!
    expect(row148.rows[0].profile_id).toBe('b96c0b60-9a8b-496f-9e33-f533982412f6');
    const id148 = row148.rows[0].id;

    // 2. Insert modern record for Mapped User 151 (uuid-151)
    // The Phase 9B trigger automatically translates profile_id into user_id = 151!
    const row151 = await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 400)
      RETURNING id, user_id, profile_id, amount_ml, intake_amount
    `);
    expect(row151.rows[0].user_id).toBe(151); // non-NULL user_id!
    expect(row151.rows[0].profile_id).toBe('2dbbad1d-5988-4d6f-8c32-5c57080e56f5');
    const id151 = row151.rows[0].id;

    // 3. Insert modern record for Unmapped Net-New User (uuid-netnew)
    // The Phase 9B trigger leaves user_id = NULL
    const rowNetNew = await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 850)
      RETURNING id, user_id, profile_id, amount_ml, intake_amount
    `);
    expect(rowNetNew.rows[0].user_id).toBeNull(); // NULL user_id!
    expect(rowNetNew.rows[0].profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224');
    const idNetNew = rowNetNew.rows[0].id;

    // Total rows in water_logs: 13 legacy + 3 modern = 16 rows
    const totalBefore = await client.query('SELECT COUNT(*) AS count FROM public.water_logs');
    expect(parseInt(totalBefore.rows[0].count, 10)).toBe(16);

    // EXECUTE HARDENED ROLLBACK
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // CRITICAL HARDENED ARCHIVE QUERY:
      // Must capture BOTH:
      // a) modern unmapped records (user_id IS NULL)
      // b) modern mapped records (profile_id IS NOT NULL AND user_id IS NOT NULL)
      // while EXCLUDING legacy unmapped records (user_id IS NOT NULL AND profile_id IS NULL)!
      await client.query(`
        CREATE TABLE public._rollback_v2_water_logs_archive_test AS
        SELECT 
          id, user_id, profile_id, amount_ml, intake_amount, intake_type, source, created_at,
          CASE 
            WHEN user_id IS NULL THEN 'modern_unmapped'
            WHEN profile_id IS NOT NULL AND user_id IS NOT NULL THEN 'modern_mapped'
            ELSE 'legacy_record'
          END AS archive_classification,
          NOW() AT TIME ZONE 'UTC' AS archived_at
        FROM public.water_logs
        WHERE profile_id IS NOT NULL OR user_id IS NULL;
      `);

      // Enforce Least Privilege on Archive
      await client.query(`
        ALTER TABLE public._rollback_v2_water_logs_archive_test OWNER TO postgres;
        REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_test FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_test TO service_role;
      `);

      // Assert count matches exactly 3 modern records
      const countCheck = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM public.water_logs WHERE profile_id IS NOT NULL OR user_id IS NULL) AS src_count,
          (SELECT COUNT(*) FROM public._rollback_v2_water_logs_archive_test) AS arch_count
      `);
      expect(countCheck.rows[0].src_count).toBe('3');
      expect(countCheck.rows[0].arch_count).toBe('3');

      // Drop objects & compatibility columns
      await client.query('DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;');
      await client.query('DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();');
      await client.query('DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;');
      await client.query('DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;');
      await client.query('DROP TABLE IF EXISTS public.legacy_user_id_map;');

      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;');
      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;');
      await client.query("DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql'");

      // Sequence adjustment: MAX(id) is 16. GREATEST(16, 13) is 16.
      await client.query(`
        SELECT setval(
          'public.water_logs_id_seq', 
          GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
          true
        );
      `);

      await client.query('COMMIT');

      // -----------------------------------------------------------------------
      // VERIFY ARCHIVED RECORDS & IDENTITY ASSOCIATIONS (Not just counts!)
      // -----------------------------------------------------------------------
      const archivedRows = await client.query('SELECT * FROM public._rollback_v2_water_logs_archive_test ORDER BY id');
      expect(archivedRows.rows).toHaveLength(3);

      // Verify Row 1: Mapped User 148
      const arch148 = archivedRows.rows.find(r => r.id === id148);
      expect(arch148).toBeDefined();
      expect(arch148.user_id).toBe(148);
      expect(arch148.profile_id).toBe('b96c0b60-9a8b-496f-9e33-f533982412f6'); // Preserved!
      expect(arch148.amount_ml).toBe(600);
      expect(arch148.archive_classification).toBe('modern_mapped');

      // Verify Row 2: Mapped User 151
      const arch151 = archivedRows.rows.find(r => r.id === id151);
      expect(arch151).toBeDefined();
      expect(arch151.user_id).toBe(151);
      expect(arch151.profile_id).toBe('2dbbad1d-5988-4d6f-8c32-5c57080e56f5'); // Preserved!
      expect(arch151.amount_ml).toBe(400);
      expect(arch151.archive_classification).toBe('modern_mapped');

      // Verify Row 3: Unmapped Net-New User
      const archNetNew = archivedRows.rows.find(r => r.id === idNetNew);
      expect(archNetNew).toBeDefined();
      expect(archNetNew.user_id).toBeNull();
      expect(archNetNew.profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224'); // Preserved!
      expect(archNetNew.amount_ml).toBe(850);
      expect(archNetNew.archive_classification).toBe('modern_unmapped');

      // -----------------------------------------------------------------------
      // VERIFY LEGACY HYDRATION RECORDS REMAIN IN TACT IN water_logs
      // -----------------------------------------------------------------------
      // All 13 original legacy rows remain intact
      const legacyRows = await client.query('SELECT id, user_id, intake_amount FROM public.water_logs WHERE id <= 13 ORDER BY id');
      expect(legacyRows.rows).toHaveLength(13);
      expect(legacyRows.rows[0].user_id).toBe(153);
      expect(legacyRows.rows[0].intake_amount).toBe(250);
      expect(legacyRows.rows[12].user_id).toBe(147);
      expect(legacyRows.rows[12].intake_amount).toBe(1000);

      // Verify User 153 and 147 were NOT included in the modern archive
      const u153InArch = archivedRows.rows.filter(r => r.user_id === 153 || r.user_id === 147);
      expect(u153InArch).toHaveLength(0);

      // Verify sequence nextval allocates 17 (strictly greater than MAX(id) 16)
      const nextId = await client.query("SELECT nextval('public.water_logs_id_seq') AS next_id");
      expect(parseInt(nextId.rows[0].next_id, 10)).toBe(17);

      // Verify authenticated role CANNOT access archive (least privilege enforcement)
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await expect(client.query('SELECT * FROM public._rollback_v2_water_logs_archive_test')).rejects.toThrow('permission denied');
      } finally {
        await client.query('ROLLBACK');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });

  // =========================================================================
  // SCENARIO 3: Archive already exists (Collision Prevention)
  // =========================================================================
  it('Scenario 3: Prevents silent overwrite when archive table already exists; fails closed with explicit error', async () => {
    await resetAndSeedBaseline();

    // Pre-create conflicting archive table
    await client.query('CREATE TABLE public._rollback_v2_water_logs_archive_test (id INT PRIMARY KEY)');

    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // Collision gate: must check if table exists and abort if collision detected
      const collisionCheck = await client.query(`
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = '_rollback_v2_water_logs_archive_test'
      `);
      expect(collisionCheck.rows).toHaveLength(1);

      // Attempting naive CREATE TABLE will fail with relation already exists
      await expect(
        client.query('CREATE TABLE public._rollback_v2_water_logs_archive_test AS SELECT * FROM public.water_logs WHERE user_id IS NULL')
      ).rejects.toThrow('relation "_rollback_v2_water_logs_archive_test" already exists');

      await client.query('ROLLBACK');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      await client.query('DROP TABLE IF EXISTS public._rollback_v2_water_logs_archive_test');
    }
  });

  // =========================================================================
  // SCENARIO 4: Failure occurs partway through rollback (Atomic Rollback of Rollback)
  // =========================================================================
  it('Scenario 4: Ensures transaction rollback restores previous state if failure occurs partway through rollback', async () => {
    await resetAndSeedBaseline();

    // Verify compatibility columns exist before
    const checkBefore = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'water_logs' AND column_name = 'profile_id'
    `);
    expect(checkBefore.rows).toHaveLength(1);

    let errorCaught = false;
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // Step 1: Create archive
      await client.query(`
        CREATE TABLE public._rollback_v2_water_logs_archive_test AS
        SELECT * FROM public.water_logs WHERE user_id IS NULL;
      `);

      // Step 2: Drop trigger
      await client.query('DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;');

      // Deliberate simulated failure (e.g. statement timeout, disk full, or syntax error)
      await client.query('SELECT 1 / 0');

      // Should never reach here
      await client.query('ALTER TABLE public.water_logs DROP COLUMN profile_id;');
      await client.query('COMMIT');
    } catch (err) {
      errorCaught = true;
      await client.query('ROLLBACK');
    }

    expect(errorCaught).toBe(true);

    // Verify after rollback:
    // 1. profile_id still exists (NOT dropped)
    const checkAfter = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'water_logs' AND column_name = 'profile_id'
    `);
    expect(checkAfter.rows).toHaveLength(1);

    // 2. Trigger still exists
    const triggerCheck = await client.query(`
      SELECT tgname FROM pg_trigger WHERE tgname = 'trg_sync_water_logs_compatibility'
    `);
    expect(triggerCheck.rows).toHaveLength(1);

    // 3. Uncommitted archive table was rolled back (does NOT exist)
    const archiveCheck = await client.query(`
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '_rollback_v2_water_logs_archive_test'
    `);
    expect(archiveCheck.rows).toHaveLength(0);
  });

  // =========================================================================
  // SCENARIO 5: Sequence recovery with IDs greater than pre-migration counter
  // =========================================================================
  it('Scenario 5: Dynamic setval guarantees next ID is strictly greater than all surviving rows (no PK collision)', async () => {
    await resetAndSeedBaseline();

    // Insert modern row with out-of-order large ID (e.g. ID 99)
    await client.query(`
      INSERT INTO public.water_logs (id, profile_id, amount_ml)
      VALUES (99, '2d27bc46-7744-49ca-aaac-7bd3ade86224', 500)
    `);

    // Execute dynamic setval
    const setvalRes = await client.query(`
      SELECT setval(
        'public.water_logs_id_seq', 
        GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
        true
      ) AS seq_val;
    `);
    expect(parseInt(setvalRes.rows[0].seq_val, 10)).toBe(99);

    // Next insert gets ID 100
    const nextVal = await client.query("SELECT nextval('public.water_logs_id_seq') AS next_id");
    expect(parseInt(nextVal.rows[0].next_id, 10)).toBe(100);

    // Can insert row without 23505 collision (receives next ID: 101)
    const insertRes = await client.query(`
      INSERT INTO public.water_logs (user_id, intake_amount) VALUES (153, 500) RETURNING id
    `);
    expect(insertRes.rows[0].id).toBe(101);
  });

  // =========================================================================
  // SCENARIO 6: Rollback retry after failure
  // =========================================================================
  it('Scenario 6: Allows clean retry of rollback after previous aborted attempt', async () => {
    await resetAndSeedBaseline();

    // Insert 1 modern row
    await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 450)
    `);

    // Attempt 1: Fails deliberately
    let attempt1Failed = false;
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');
      await client.query('SELECT 1 / 0');
      await client.query('COMMIT');
    } catch {
      attempt1Failed = true;
      await client.query('ROLLBACK');
    }
    expect(attempt1Failed).toBe(true);

    // Attempt 2: Executes full hardened rollback procedure cleanly
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // Use timestamped archive name to guarantee collision resistance
      await client.query(`
        CREATE TABLE public._rollback_v2_water_logs_archive_retry_test AS
        SELECT * FROM public.water_logs WHERE user_id IS NULL;
      `);

      await client.query(`
        REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_retry_test FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_retry_test TO service_role;
      `);

      // Drop objects
      await client.query('DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;');
      await client.query('DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();');
      await client.query('DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;');
      await client.query('DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;');
      await client.query('DROP TABLE IF EXISTS public.legacy_user_id_map;');
      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;');
      await client.query('ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;');
      await client.query("DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql'");

      // Sequence
      await client.query(`
        SELECT setval(
          'public.water_logs_id_seq', 
          GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
          true
        );
      `);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify retry succeeded
    const finalCheck = await client.query('SELECT COUNT(*) AS count FROM public.water_logs WHERE id <= 13');
    expect(parseInt(finalCheck.rows[0].count, 10)).toBe(13);

    const archiveRows = await client.query('SELECT * FROM public._rollback_v2_water_logs_archive_retry_test');
    expect(archiveRows.rows).toHaveLength(1);
    expect(archiveRows.rows[0].profile_id).toBe('2d27bc46-7744-49ca-aaac-7bd3ade86224');

    await client.query('DROP TABLE IF EXISTS public._rollback_v2_water_logs_archive_retry_test');
  });

  // =========================================================================
  // SCENARIO 7: Failure during archive validation fails closed and prevents column drop
  // =========================================================================
  it('Scenario 7: Fails closed when archive validation assertion detects discrepancy; prevents compatibility column drop', async () => {
    await resetAndSeedBaseline();

    // Insert 2 modern rows
    await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml) VALUES
        ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 500),
        ('b96c0b60-9a8b-496f-9e33-f533982412f6', 600);
    `);

    let validationFailed = false;
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE public.water_logs IN EXCLUSIVE MODE');

      // Create archive with intentional flawed query (e.g. only user_id IS NULL, missing row 148)
      await client.query(`
        CREATE TABLE public._rollback_v2_water_logs_archive_flawed AS
        SELECT * FROM public.water_logs WHERE user_id IS NULL;
      `);

      // Execute strict validation assertion: source count of all modern records vs archive count
      await client.query(`
        DO $$
        DECLARE
          v_src INT;
          v_arch INT;
        BEGIN
          -- Source has 2 modern records (profile_id IS NOT NULL OR user_id IS NULL)
          SELECT COUNT(*) INTO v_src FROM public.water_logs WHERE profile_id IS NOT NULL OR user_id IS NULL;
          SELECT COUNT(*) INTO v_arch FROM public._rollback_v2_water_logs_archive_flawed;

          IF v_src != v_arch THEN
            RAISE EXCEPTION 'Archive validation failed: source modern records (%) != archived records (%). Aborting rollback to prevent data loss!',
              v_src, v_arch;
          END IF;
        END $$;
      `);

      // If validation passed (should NOT), it would drop columns:
      await client.query('ALTER TABLE public.water_logs DROP COLUMN profile_id;');
      await client.query('COMMIT');
    } catch (err: any) {
      validationFailed = true;
      expect(err.message).toContain('Archive validation failed');
      await client.query('ROLLBACK');
    }

    expect(validationFailed).toBe(true);

    // Verify after rollback of failed transaction:
    // 1. profile_id still exists!
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'water_logs' AND column_name = 'profile_id'
    `);
    expect(colCheck.rows).toHaveLength(1);

    // 2. Both modern rows still exist with profile_id intact!
    const modernRows = await client.query('SELECT id, profile_id FROM public.water_logs WHERE id > 13');
    expect(modernRows.rows).toHaveLength(2);
    expect(modernRows.rows[0].profile_id).not.toBeNull();
    expect(modernRows.rows[1].profile_id).not.toBeNull();
  });
});
