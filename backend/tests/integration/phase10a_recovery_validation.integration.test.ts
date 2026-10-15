import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

describe('DB-4F: Phase 10A Recovery Procedure Validation (Disposable PostgreSQL 18)', () => {
  let client: Client;

  const CHECKPOINT_SQL_PATH = 'C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_pre_phase10a_2026-10-11T19-02-14-189Z.sql';
  const PHASE_10A_SQL = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/phase_10a_nutrition_core_schema.sql'), 'utf-8');

  beforeAll(async () => {
    // Strictly disposable local PostgreSQL instance on port 5433
    client = new Client({
      host: '127.0.0.1',
      port: 5433,
      user: 'postgres',
      password: 'postgres_dev_password',
      database: 'postgres',
    });

    await client.connect();

    // Verify isolation: must NOT be connected to remote staging
    const hostRes = await client.query('SELECT inet_server_addr() AS srv_addr');
    const srvAddr = hostRes.rows[0]?.srv_addr;
    if (srvAddr && srvAddr.toString().includes('2406:da1a')) {
      throw new Error('SAFETY VIOLATION: Test connection is targeting remote staging!');
    }
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  async function resetToPhase9BBaseline() {
    await client.query('ROLLBACK;').catch(() => {});

    // Clean up archive tables
    const archiveTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'archive_%';
    `);
    for (const row of archiveTables.rows) {
      await client.query(`DROP TABLE IF EXISTS public.${row.table_name} CASCADE;`);
    }

    await client.query(`
      DROP VIEW IF EXISTS public.v2_daily_nutrition_summary CASCADE;
      DROP TABLE IF EXISTS public.v2_nutrition_logs CASCADE;
      DROP TABLE IF EXISTS public.legacy_user_id_map CASCADE;
      DROP TABLE IF EXISTS public.water_logs CASCADE;
      DROP TABLE IF EXISTS public.organization_members CASCADE;
      DROP TABLE IF EXISTS public.organizations CASCADE;
      DROP TABLE IF EXISTS public.profiles CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;
      DROP TABLE IF EXISTS public.exercises CASCADE;
      DROP TABLE IF EXISTS public.exercise_categories CASCADE;
      DROP TABLE IF EXISTS public._migrations CASCADE;
      DROP TABLE IF EXISTS auth.users CASCADE;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        owner_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        timezone TEXT DEFAULT 'UTC',
        organization_id UUID REFERENCES public.organizations(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'Member',
        location_id UUID,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR,
        name VARCHAR,
        email VARCHAR UNIQUE NOT NULL,
        avatar TEXT,
        profile_context TEXT,
        chat_id VARCHAR,
        password VARCHAR,
        phone VARCHAR,
        water_goal INT DEFAULT 2000,
        calorie_goal INT DEFAULT 0,
        protein_goal INT DEFAULT 0,
        carb_goal INT DEFAULT 0,
        fat_goal INT DEFAULT 0,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        last_login TIMESTAMPTZ
      );

      CREATE TABLE public.water_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES public.users(id) ON DELETE CASCADE,
        intake_amount INT NOT NULL,
        intake_type VARCHAR DEFAULT 'water',
        source VARCHAR DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT now(),
        profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        amount_ml INT
      );

      CREATE TABLE public.legacy_user_id_map (
        legacy_integer_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
        profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.exercise_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        instructions TEXT[],
        difficulty VARCHAR(50) DEFAULT 'intermediate',
        category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
        movement_pattern_id UUID,
        exercise_type_id UUID,
        video_url TEXT,
        thumbnail_url TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public._migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }

  beforeEach(async () => {
    await resetToPhase9BBaseline();
  });

  // ==========================================
  // SECTION 1: CHECKPOINT REPLAY & INTEGRITY
  // ==========================================
  describe('1. Checkpoint Replay & Baseline Idempotency', () => {
    it('replays the DB-4E logical checkpoint SQL cleanly without syntax or foreign key errors', async () => {
      // Create referenced auth users to satisfy profile FKs
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);

      const checkpointSql = fs.readFileSync(CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);

      // Verify captured table row counts
      const waterRes = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterRes.rows[0].count)).toBe(13);

      const mapRes = await client.query('SELECT COUNT(*) FROM public.legacy_user_id_map;');
      expect(parseInt(mapRes.rows[0].count)).toBe(2);

      const migRes = await client.query('SELECT COUNT(*) FROM public._migrations;');
      expect(parseInt(migRes.rows[0].count)).toBe(23);

      const userRes = await client.query('SELECT COUNT(*) FROM public.users;');
      expect(parseInt(userRes.rows[0].count)).toBe(7);

      const profRes = await client.query('SELECT COUNT(*) FROM public.profiles;');
      expect(parseInt(profRes.rows[0].count)).toBe(5);

      const orgRes = await client.query('SELECT COUNT(*) FROM public.organizations;');
      expect(parseInt(orgRes.rows[0].count)).toBe(1);

      const exRes = await client.query('SELECT COUNT(*) FROM public.exercises;');
      expect(parseInt(exRes.rows[0].count)).toBe(4);

      // Verify sequence setval positions
      const seqRes = await client.query("SELECT last_value FROM pg_sequences WHERE sequencename = 'water_logs_id_seq';");
      expect(parseInt(seqRes.rows[0].last_value)).toBe(18);
    });

    it('demonstrates strict ON CONFLICT DO NOTHING idempotency on duplicate replay', async () => {
      // Seed auth users
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);

      const checkpointSql = fs.readFileSync(CHECKPOINT_SQL_PATH, 'utf-8');

      // First replay
      await client.query(checkpointSql);

      // Second replay (simulating retry / duplicate replay)
      await client.query(checkpointSql);

      // Assert row counts did NOT duplicate
      const waterRes = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterRes.rows[0].count)).toBe(13);

      const mapRes = await client.query('SELECT COUNT(*) FROM public.legacy_user_id_map;');
      expect(parseInt(mapRes.rows[0].count)).toBe(2);

      const migRes = await client.query('SELECT COUNT(*) FROM public._migrations;');
      expect(parseInt(migRes.rows[0].count)).toBe(23);
    });
  });

  // ==========================================
  // SECTION 2: PHASE 10A RECOVERY PROCEDURE
  // ==========================================
  describe('2. Corrected Recovery Procedure (Narrow Scoping without CASCADE)', () => {
    beforeEach(async () => {
      // Replay baseline checkpoint
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);
      const checkpointSql = fs.readFileSync(CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);
    });

    it('cleans up aborted/failed Phase 10A deployment safely using RESTRICT', async () => {
      // Apply Phase 10A
      await client.query(PHASE_10A_SQL);
      await client.query("INSERT INTO public._migrations (name, run_at) VALUES ('phase_10a_nutrition_core_schema.sql', now());");

      // Verify Phase 10A objects exist
      const checkTables = await client.query(`
        SELECT table_name FROM information_schema.tables WHERE table_name = 'v2_nutrition_logs';
      `);
      expect(checkTables.rows).toHaveLength(1);

      // Execute Narrow Corrected Recovery Procedure (RESTRICT, no CASCADE)
      await client.query(`
        BEGIN;

        -- 1. Drop view explicitly with RESTRICT
        DROP VIEW IF EXISTS public.v2_daily_nutrition_summary RESTRICT;

        -- 2. Drop table explicitly with RESTRICT
        DROP TABLE IF EXISTS public.v2_nutrition_logs RESTRICT;

        -- 3. Delete migration record
        DELETE FROM public._migrations WHERE name = 'phase_10a_nutrition_core_schema.sql';

        COMMIT;
      `);

      // Verify Phase 10A objects are removed
      const checkRemoved = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name IN ('v2_nutrition_logs', 'v2_daily_nutrition_summary');
      `);
      expect(checkRemoved.rows).toHaveLength(0);

      // Verify migration count returned to 23
      const migCount = await client.query('SELECT COUNT(*) FROM public._migrations;');
      expect(parseInt(migCount.rows[0].count)).toBe(23);

      // Verify baseline objects remain 100% intact
      const waterCount = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterCount.rows[0].count)).toBe(13);
      const mapCount = await client.query('SELECT COUNT(*) FROM public.legacy_user_id_map;');
      expect(parseInt(mapCount.rows[0].count)).toBe(2);
    });

    it('preserves modern post-deployment data in archive table before dropping table with RESTRICT', async () => {
      // Apply Phase 10A
      await client.query(PHASE_10A_SQL);
      await client.query("INSERT INTO public._migrations (name, run_at) VALUES ('phase_10a_nutrition_core_schema.sql', now());");

      const memberId = 'b96c0b60-9a8b-496f-9e33-f533982412f6';

      // Insert live modern traffic
      await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, meal_type, food_name, calories, protein_g, carbs_g, fats_g)
        VALUES 
          ('${memberId}', 'breakfast', 'Oatmeal & Whey Protein', 450, 35.0, 50.0, 8.0),
          ('${memberId}', 'lunch', 'Chicken Breast & Brown Rice', 650, 55.0, 65.0, 12.0);
      `);

      // Execute Post-Traffic Rollback with Archive Protocol
      const timestamp = '20261012_test';
      await client.query(`
        BEGIN;

        -- 1. Archive modern data
        CREATE TABLE public.archive_v2_nutrition_logs_${timestamp} AS
        SELECT * FROM public.v2_nutrition_logs;

        -- 2. Drop view and table with RESTRICT
        DROP VIEW IF EXISTS public.v2_daily_nutrition_summary RESTRICT;
        DROP TABLE IF EXISTS public.v2_nutrition_logs RESTRICT;

        -- 3. Delete migration tracking
        DELETE FROM public._migrations WHERE name = 'phase_10a_nutrition_core_schema.sql';

        COMMIT;
      `);

      // Verify archive retains both modern meals
      const archiveRows = await client.query(`SELECT * FROM public.archive_v2_nutrition_logs_${timestamp} ORDER BY calories;`);
      expect(archiveRows.rows).toHaveLength(2);
      expect(archiveRows.rows[0].food_name).toBe('Oatmeal & Whey Protein');
      expect(archiveRows.rows[1].food_name).toBe('Chicken Breast & Brown Rice');
      expect(archiveRows.rows[0].user_id).toBe(memberId);

      // Verify operational table is dropped
      const opTable = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'v2_nutrition_logs';");
      expect(opTable.rows).toHaveLength(0);
    });

    it('demonstrates RESTRICT prevents accidental drop when unexpected dependent view exists', async () => {
      await client.query(PHASE_10A_SQL);

      // Create an unexpected external reporting view depending on v2_nutrition_logs
      await client.query(`
        CREATE VIEW public.external_bi_nutrition_report AS
        SELECT user_id, COUNT(*) AS meal_count FROM public.v2_nutrition_logs GROUP BY user_id;
      `);

      // Attempting to drop v2_nutrition_logs with RESTRICT must FAIL closed and protect the dependent view
      await expect(client.query(`
        DROP TABLE public.v2_nutrition_logs RESTRICT;
      `)).rejects.toThrow(/cannot drop table.*because other objects depend on it/);

      // Clean up the dependent view
      await client.query('DROP VIEW public.external_bi_nutrition_report CASCADE;');
    });
  });
});
