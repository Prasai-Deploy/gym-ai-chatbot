import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

describe('DB-4G: Fresh Pre-Phase-10A Checkpoint Replay & Recovery Validation (Disposable PostgreSQL 18)', () => {
  let client: Client;

  const FRESH_CHECKPOINT_SQL_PATH = 'C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql';
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
      await client.query(`DROP TABLE IF EXISTS public."${row.table_name}" CASCADE;`);
    }

    await client.query(`
      DROP VIEW IF EXISTS public.unauthorized_custom_nutrition_report CASCADE;
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
      DROP TABLE IF EXISTS public.nutrition_logs CASCADE;
      DROP TABLE IF EXISTS public.user_meal_tracking CASCADE;
      DROP TABLE IF EXISTS public.meal_plans CASCADE;
      DROP TABLE IF EXISTS public.workout_plans CASCADE;
      DROP TABLE IF EXISTS public.workout_sessions CASCADE;
      DROP TABLE IF EXISTS public.workout_logs CASCADE;
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

      CREATE SEQUENCE IF NOT EXISTS public.users_id_seq START WITH 1;
      CREATE TABLE public.users (
        id INT PRIMARY KEY DEFAULT nextval('public.users_id_seq'),
        google_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar TEXT,
        profile_context TEXT,
        chat_id VARCHAR(255),
        password VARCHAR(255),
        phone VARCHAR(50),
        water_goal INT DEFAULT 2000,
        calorie_goal INT DEFAULT 0,
        protein_goal INT DEFAULT 0,
        carb_goal INT DEFAULT 0,
        fat_goal INT DEFAULT 0,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        last_login TIMESTAMPTZ
      );

      CREATE SEQUENCE IF NOT EXISTS public.water_logs_id_seq START WITH 1;
      CREATE TABLE public.water_logs (
        id INT PRIMARY KEY DEFAULT nextval('public.water_logs_id_seq'),
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

      DO $$ BEGIN
        CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE public.exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        instructions TEXT[],
        difficulty exercise_difficulty DEFAULT 'intermediate',
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

      CREATE TABLE public.nutrition_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        date DATE,
        food_item VARCHAR(255),
        calories INT,
        protein INT,
        protein_g NUMERIC,
        carbs INT,
        carbs_g NUMERIC,
        fats INT,
        fat_g NUMERIC,
        logged_at TIMESTAMPTZ
      );

      CREATE TABLE public.user_meal_tracking (
        id SERIAL PRIMARY KEY,
        user_id INT,
        date DATE,
        meal_type VARCHAR(50),
        food_item VARCHAR(255),
        calories INT,
        protein INT,
        carbs INT,
        fats INT,
        created_at TIMESTAMPTZ
      );

      CREATE TABLE public.meal_plans (
        id SERIAL PRIMARY KEY,
        user_id INT,
        date DATE,
        calories_target INT,
        meals JSONB,
        created_at TIMESTAMPTZ
      );

      CREATE TABLE public.workout_plans (
        id SERIAL PRIMARY KEY,
        user_id INT,
        date DATE,
        focus VARCHAR(255),
        duration VARCHAR(50),
        exercises JSONB,
        calories_estimate INT,
        difficulty VARCHAR(50),
        raw_prompt TEXT,
        created_at TIMESTAMPTZ
      );

      CREATE TABLE public.workout_sessions (
        id SERIAL PRIMARY KEY,
        user_id INT,
        plan_id INT,
        status VARCHAR(50),
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        completed_exercises JSONB,
        progress_percentage INT,
        calories_burned INT,
        created_at TIMESTAMPTZ
      );

      CREATE TABLE public.workout_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        plan_id INT,
        date DATE,
        exercise_name VARCHAR(255),
        workout_name VARCHAR(255),
        sets_done SMALLINT,
        reps_done VARCHAR(50),
        weight_used NUMERIC,
        difficulty SMALLINT,
        duration_minutes INT,
        notes TEXT,
        logged_at TIMESTAMPTZ
      );
    `);
  }

  beforeEach(async () => {
    await resetToPhase9BBaseline();
  });

  describe('1. DB-4G Checkpoint Replay & Baseline Idempotency', () => {
    it('replays the fresh DB-4G logical checkpoint SQL cleanly without syntax or foreign key errors', async () => {
      // Create referenced auth users to satisfy profile FKs
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);

      const checkpointSql = fs.readFileSync(FRESH_CHECKPOINT_SQL_PATH, 'utf-8');
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

      const userSeqRes = await client.query("SELECT last_value FROM pg_sequences WHERE sequencename = 'users_id_seq';");
      expect(parseInt(userSeqRes.rows[0].last_value)).toBe(153);
    });

    it('demonstrates strict ON CONFLICT DO NOTHING idempotency on duplicate replay', async () => {
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);

      const checkpointSql = fs.readFileSync(FRESH_CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);

      // Replay a second consecutive time
      await client.query(checkpointSql);

      const waterRes = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterRes.rows[0].count)).toBe(13);

      const mapRes = await client.query('SELECT COUNT(*) FROM public.legacy_user_id_map;');
      expect(parseInt(mapRes.rows[0].count)).toBe(2);

      const migRes = await client.query('SELECT COUNT(*) FROM public._migrations;');
      expect(parseInt(migRes.rows[0].count)).toBe(23);
    });
  });

  describe('2. Phase 10A Recovery Procedure Verification', () => {
    it('cleans up aborted/failed Phase 10A deployment safely using RESTRICT', async () => {
      // 1. Establish baseline from DB-4G checkpoint
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);
      const checkpointSql = fs.readFileSync(FRESH_CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);

      // 2. Deploy Phase 10A
      await client.query(PHASE_10A_SQL);
      await client.query(`
        INSERT INTO public._migrations (name, run_at)
        VALUES ('phase_10a_nutrition_core_schema.sql', now());
      `);

      // Verify Phase 10A objects exist
      const tblCheck = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs';
      `);
      expect(tblCheck.rows.length).toBe(1);

      // 3. Execute Pre-Traffic Rollback using RESTRICT
      await client.query(`
        BEGIN;
        SELECT pg_advisory_xact_lock(746291048201582);
        DROP VIEW IF EXISTS public.v2_daily_nutrition_summary RESTRICT;
        DROP TABLE IF EXISTS public.v2_nutrition_logs RESTRICT;
        DELETE FROM public._migrations WHERE name = 'phase_10a_nutrition_core_schema.sql';
        COMMIT;
      `);

      // 4. Verify Phase 10A is gone and baseline intact
      const tblAfter = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs';
      `);
      expect(tblAfter.rows.length).toBe(0);

      const migAfter = await client.query('SELECT COUNT(*) FROM public._migrations;');
      expect(parseInt(migAfter.rows[0].count)).toBe(23);

      const waterAfter = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterAfter.rows[0].count)).toBe(13);
    });

    it('preserves modern post-deployment data in archive table before dropping table with RESTRICT', async () => {
      // 1. Establish baseline from DB-4G checkpoint
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);
      const checkpointSql = fs.readFileSync(FRESH_CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);

      // 2. Deploy Phase 10A
      await client.query(PHASE_10A_SQL);
      await client.query(`
        INSERT INTO public._migrations (name, run_at)
        VALUES ('phase_10a_nutrition_core_schema.sql', now());
      `);

      // 3. Simulate post-deployment modern meals
      await client.query(`
        INSERT INTO public.v2_nutrition_logs (
          user_id, date, meal_type, food_name, calories, protein_g, carbs_g, fats_g, notes
        ) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', '2026-10-12', 'breakfast', 'Oatmeal & Protein Shake', 450, 35.00, 55.00, 8.00, 'Pre-workout breakfast'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', '2026-10-12', 'lunch', 'Grilled Chicken Salad', 520, 48.00, 15.00, 22.00, 'Post-workout lunch');
      `);

      const mealCheck = await client.query('SELECT COUNT(*) FROM public.v2_nutrition_logs;');
      expect(parseInt(mealCheck.rows[0].count)).toBe(2);

      // 4. Execute Post-Traffic Rollback with Archive Protocol
      const archiveTableName = 'archive_v2_nutrition_logs_20261012_db4g';
      await client.query(`
        BEGIN;
        SELECT pg_advisory_xact_lock(746291048201582);
        CREATE TABLE public."${archiveTableName}" AS
        SELECT * FROM public.v2_nutrition_logs;
        DROP VIEW IF EXISTS public.v2_daily_nutrition_summary RESTRICT;
        DROP TABLE IF EXISTS public.v2_nutrition_logs RESTRICT;
        DELETE FROM public._migrations WHERE name = 'phase_10a_nutrition_core_schema.sql';
        COMMIT;
      `);

      // 5. Verify archive table contains all modern meals
      const archiveCheck = await client.query(`SELECT COUNT(*) FROM public."${archiveTableName}";`);
      expect(parseInt(archiveCheck.rows[0].count)).toBe(2);

      // Verify v2_nutrition_logs is gone
      const tblCheck = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs';
      `);
      expect(tblCheck.rows.length).toBe(0);
    });

    it('demonstrates RESTRICT prevents accidental drop when unexpected dependent view exists', async () => {
      // 1. Establish baseline from DB-4G checkpoint & deploy Phase 10A
      await client.query(`
        INSERT INTO auth.users (id, email) VALUES
          ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'sagarpaswan2455@gmail.com'),
          ('e17245f8-6248-4c48-b58f-f0dc6a17dda8', 'ghoshdebosmita702@gmail.com'),
          ('2d27bc46-7744-49ca-aaac-7bd3ade86224', 'qa_verifier@sweatfix.com'),
          ('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', 'demo@sweatfix.com'),
          ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'priyanshupaswan648@gmail.com');
      `);
      const checkpointSql = fs.readFileSync(FRESH_CHECKPOINT_SQL_PATH, 'utf-8');
      await client.query(checkpointSql);
      await client.query(PHASE_10A_SQL);

      // 2. Create an unauthorized external dependent view
      await client.query(`
        CREATE VIEW public.unauthorized_custom_nutrition_report AS
        SELECT id, user_id, food_name FROM public.v2_nutrition_logs;
      `);

      // 3. Attempt to drop v2_nutrition_logs with RESTRICT without dropping the external view first
      let caughtError: Error | null = null;
      try {
        await client.query('DROP TABLE public.v2_nutrition_logs RESTRICT;');
      } catch (err: any) {
        caughtError = err;
      }

      // 4. Verify PostgreSQL failed closed and protected the dependent view
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(/depend/i);

      // Verify table still exists
      const tblCheck = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs';
      `);
      expect(tblCheck.rows.length).toBe(1);
    });
  });
});
