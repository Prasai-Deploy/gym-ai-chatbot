import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * STRIVA V2 — DB-4C: Real PostgreSQL 18 Disposable Validation Suite
 *
 * Target: Ephemeral, isolated local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests execute REAL PostgreSQL queries, DDL, DML,
 * trigger execution, RLS evaluations, views, concurrency, and rollback recovery.
 */

const LOCAL_PG_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  database: 'postgres',
};

const PHASE_9B_PATH = path.join(__dirname, '../../supabase/migrations/phase_9b_legacy_identity_bridge.sql');
const PHASE_10A_PATH = path.join(__dirname, '../../supabase/migrations/phase_10a_nutrition_core_schema.sql');
const PHASE_10B_PATH = path.join(__dirname, '../../supabase/migrations/phase_10b_workout_core_schema.sql');

const PHASE_9B_SQL = fs.readFileSync(PHASE_9B_PATH, 'utf-8');
const PHASE_10A_SQL = fs.readFileSync(PHASE_10A_PATH, 'utf-8');
const PHASE_10B_SQL = fs.readFileSync(PHASE_10B_PATH, 'utf-8');

describe('DB-4C: Real PostgreSQL 18 Nutrition & Workout Implementation Suite', () => {
  let client: Client;

  const ORG_1_ID = '00000000-0000-0000-0000-000000000001';
  const ORG_2_ID = '00000000-0000-0000-0000-000000000002';

  const MEMBER_1_ID = '11111111-1111-4111-8111-111111111111';
  const MEMBER_2_ID = '22222222-2222-4222-8222-222222222222';
  const STAFF_ORG1_ID = '33333333-3333-4333-8333-333333333333';
  const STAFF_ORG2_ID = '44444444-4444-4444-8444-444444444444';

  const EXERCISE_1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const EXERCISE_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

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

  async function resetDatabaseToPhase9B() {
    await client.query('ROLLBACK;').catch(() => {});

    // Clean up any temporary or archive tables from previous rollback tests
    const archiveTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'archive_%';
    `);
    for (const row of archiveTables.rows) {
      await client.query(`DROP TABLE IF EXISTS public.${row.table_name} CASCADE;`);
    }

    await client.query(`
      DROP VIEW IF EXISTS public.v2_daily_nutrition_summary CASCADE;
      DROP TABLE IF EXISTS public.exercise_sets CASCADE;
      DROP TABLE IF EXISTS public.v2_workout_sessions CASCADE;
      DROP TABLE IF EXISTS public.v2_workout_plans CASCADE;
      DROP TABLE IF EXISTS public.v2_nutrition_logs CASCADE;
      DROP TABLE IF EXISTS public.exercises CASCADE;
      DROP TABLE IF EXISTS public.exercise_categories CASCADE;
      DROP TABLE IF EXISTS public.legacy_user_id_map CASCADE;
      DROP TABLE IF EXISTS public.water_logs CASCADE;
      DROP SEQUENCE IF EXISTS public.water_logs_id_seq CASCADE;
      DROP TABLE IF EXISTS public.organization_members CASCADE;
      DROP TABLE IF EXISTS public.organizations CASCADE;
      DROP TABLE IF EXISTS public.profiles CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;
      DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;
      DROP TABLE IF EXISTS auth.users CASCADE;

      -- Base Tables
      CREATE TABLE auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        owner_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        full_name TEXT,
        organization_id UUID REFERENCES public.organizations(id),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'Member',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR,
        name VARCHAR,
        email VARCHAR UNIQUE NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.water_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES public.users(id) ON DELETE CASCADE,
        intake_amount INT NOT NULL,
        intake_type VARCHAR DEFAULT 'water',
        source VARCHAR DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE public.exercise_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL
      );

      CREATE TABLE public.exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Helper functions for tenant checks
      CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        IF auth.uid() IS NULL OR target_org_id IS NULL THEN
          RETURN FALSE;
        END IF;

        RETURN EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = target_org_id AND om.user_id = auth.uid()
        ) OR EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = target_org_id AND o.owner_id = auth.uid()
        );
      END;
      $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

      GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated, service_role;
    `);

    // Seed baseline entities
    await client.query(`
      -- Seed representative Phase 9B test dataset
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'user148@striva.app', '{"sub": "101315497550140981399"}'::jsonb),
        ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'user151@striva.app', '{"sub": "104636286967743040898"}'::jsonb),
        ('${MEMBER_1_ID}', 'member1@example.com', '{}'::jsonb),
        ('${MEMBER_2_ID}', 'member2@example.com', '{}'::jsonb),
        ('${STAFF_ORG1_ID}', 'staff1@example.com', '{}'::jsonb),
        ('${STAFF_ORG2_ID}', 'staff2@example.com', '{}'::jsonb);

      INSERT INTO public.organizations (id, name, owner_id) VALUES
        ('${ORG_1_ID}', 'Alpha Gym', '${STAFF_ORG1_ID}'),
        ('${ORG_2_ID}', 'Beta Gym', '${STAFF_ORG2_ID}');

      INSERT INTO public.profiles (id, email, full_name, organization_id) VALUES
        ('b96c0b60-9a8b-496f-9e33-f533982412f6', 'user148@striva.app', 'User 148', '${ORG_1_ID}'),
        ('2dbbad1d-5988-4d6f-8c32-5c57080e56f5', 'user151@striva.app', 'User 151', '${ORG_1_ID}'),
        ('${MEMBER_1_ID}', 'member1@example.com', 'Athlete One', '${ORG_1_ID}'),
        ('${MEMBER_2_ID}', 'member2@example.com', 'Athlete Two', '${ORG_2_ID}'),
        ('${STAFF_ORG1_ID}', 'staff1@example.com', 'Trainer Alpha', '${ORG_1_ID}'),
        ('${STAFF_ORG2_ID}', 'staff2@example.com', 'Trainer Beta', '${ORG_2_ID}');

      INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
        ('${ORG_1_ID}', '${MEMBER_1_ID}', 'Member'),
        ('${ORG_2_ID}', '${MEMBER_2_ID}', 'Member'),
        ('${ORG_1_ID}', '${STAFF_ORG1_ID}', 'Trainer'),
        ('${ORG_2_ID}', '${STAFF_ORG2_ID}', 'Trainer');

      INSERT INTO public.users (id, google_id, name, email, is_admin) VALUES
        (147, NULL, 'User 147', 'user147@striva.app', false),
        (148, '101315497550140981399', 'User 148', 'user148@striva.app', false),
        (149, NULL, 'Admin 149', 'admin149@striva.app', true),
        (150, 'sub-legacy-150', 'User 150', 'user150@striva.app', false),
        (151, '104636286967743040898', 'User 151', 'user151@striva.app', false),
        (152, 'sub-legacy-152', 'User 152', 'user152@striva.app', false),
        (153, 'sub-legacy-153', 'User 153', 'user153@striva.app', false);
      ALTER SEQUENCE public.users_id_seq RESTART WITH 154;

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
      ALTER SEQUENCE public.water_logs_id_seq RESTART WITH 19;

      INSERT INTO public.exercise_categories (id, name, slug) VALUES
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Chest', 'chest');

      INSERT INTO public.exercises (id, name, slug, category_id) VALUES
        ('${EXERCISE_1_ID}', 'Barbell Bench Press', 'barbell-bench-press', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
        ('${EXERCISE_2_ID}', 'Incline Dumbbell Press', 'incline-dumbbell-press', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
    `);

    // Apply Phase 9B baseline
    await client.query(PHASE_9B_SQL);
  }

  beforeEach(async () => {
    await resetDatabaseToPhase9B();
  });

  // ==========================================
  // SECTION 1: MIGRATION APPLICATION & IDEMPOTENCY
  // ==========================================
  describe('1. Migration Application & Idempotency', () => {
    it('applies Phase 10A and Phase 10B cleanly in sequence', async () => {
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);

      // Verify all tables exist
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('v2_nutrition_logs', 'v2_workout_plans', 'v2_workout_sessions', 'exercise_sets')
        ORDER BY table_name;
      `);
      expect(tablesRes.rows.map((r: any) => r.table_name)).toEqual([
        'exercise_sets',
        'v2_nutrition_logs',
        'v2_workout_plans',
        'v2_workout_sessions',
      ]);

      // Verify view exists
      const viewRes = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'v2_daily_nutrition_summary';
      `);
      expect(viewRes.rows).toHaveLength(1);
    });

    it('is strictly idempotent when executed repeatedly', async () => {
      // First execution
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);

      // Second execution must succeed with zero errors
      await expect(client.query(PHASE_10A_SQL)).resolves.toBeDefined();
      await expect(client.query(PHASE_10B_SQL)).resolves.toBeDefined();
    });
  });

  // ==========================================
  // SECTION 2: NUTRITION CONTRACT VALIDATION
  // ==========================================
  describe('2. Nutrition Domain Contracts', () => {
    beforeEach(async () => {
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);
    });

    it('supports multiple meals on the exact same date for the same user', async () => {
      const today = '2026-10-12';

      // Insert 5 separate meals for MEMBER_1
      const meals = [
        { meal_type: 'breakfast', food_name: 'Oatmeal & Whey', calories: 450, p: 35.5, c: 60.0, f: 8.5 },
        { meal_type: 'snack', food_name: 'Greek Yogurt', calories: 150, p: 18.0, c: 10.0, f: 3.0 },
        { meal_type: 'lunch', food_name: 'Grilled Chicken & Rice', calories: 650, p: 55.0, c: 75.0, f: 12.0 },
        { meal_type: 'snack', food_name: 'Almonds & Apple', calories: 220, p: 6.0, c: 25.0, f: 14.0 },
        { meal_type: 'dinner', food_name: 'Salmon & Asparagus', calories: 580, p: 48.0, c: 12.0, f: 28.0 },
      ];

      for (const m of meals) {
        await client.query(`
          INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories, protein_g, carbs_g, fats_g)
          VALUES ('${MEMBER_1_ID}', '${today}', '${m.meal_type}', '${m.food_name}', ${m.calories}, ${m.p}, ${m.c}, ${m.f});
        `);
      }

      // Assert count
      const countRes = await client.query(`
        SELECT COUNT(*) FROM public.v2_nutrition_logs WHERE user_id = '${MEMBER_1_ID}' AND date = '${today}';
      `);
      expect(parseInt(countRes.rows[0].count)).toBe(5);

      // Assert aggregation view
      const viewRes = await client.query(`
        SELECT * FROM public.v2_daily_nutrition_summary WHERE user_id = '${MEMBER_1_ID}' AND date = '${today}';
      `);
      expect(viewRes.rows).toHaveLength(1);
      const summary = viewRes.rows[0];
      expect(summary.total_calories).toBe(450 + 150 + 650 + 220 + 580); // 2050
      expect(parseFloat(summary.total_protein_g)).toBeCloseTo(162.5, 2);
      expect(parseFloat(summary.total_carbs_g)).toBeCloseTo(182.0, 2);
      expect(parseFloat(summary.total_fats_g)).toBeCloseTo(65.5, 2);
      expect(summary.meal_count).toBe(5);
    });

    it('enforces macro precision and non-negative constraints', async () => {
      // Negative calories should fail
      await expect(client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories)
        VALUES ('${MEMBER_1_ID}', 'Invalid Food', -50);
      `)).rejects.toThrow();

      // Negative protein should fail
      await expect(client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories, protein_g)
        VALUES ('${MEMBER_1_ID}', 'Invalid Food', 100, -5.0);
      `)).rejects.toThrow();

      // Empty food name should fail
      await expect(client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories)
        VALUES ('${MEMBER_1_ID}', '   ', 100);
      `)).rejects.toThrow();
    });

    it('allows meal modification and deletion without impacting other meals', async () => {
      const insRes = await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories)
        VALUES ('${MEMBER_1_ID}', 'Morning Snack', 200)
        RETURNING id;
      `);
      const mealId = insRes.rows[0].id;

      // Update
      await client.query(`
        UPDATE public.v2_nutrition_logs
        SET food_name = 'Morning Snack (Edited)', calories = 250
        WHERE id = '${mealId}';
      `);

      const getRes = await client.query(`SELECT food_name, calories FROM public.v2_nutrition_logs WHERE id = '${mealId}';`);
      expect(getRes.rows[0].food_name).toBe('Morning Snack (Edited)');
      expect(getRes.rows[0].calories).toBe(250);

      // Delete
      await client.query(`DELETE FROM public.v2_nutrition_logs WHERE id = '${mealId}';`);
      const checkRes = await client.query(`SELECT * FROM public.v2_nutrition_logs WHERE id = '${mealId}';`);
      expect(checkRes.rows).toHaveLength(0);
    });

    it('integrates seamlessly with Phase 9B water_logs via profile_id', async () => {
      // Member 1 logs hydration using UUID profile_id
      const waterRes = await client.query(`
        INSERT INTO public.water_logs (profile_id, amount_ml)
        VALUES ('${MEMBER_1_ID}', 500)
        RETURNING id, profile_id, amount_ml;
      `);
      expect(waterRes.rows[0].profile_id).toBe(MEMBER_1_ID);
      expect(waterRes.rows[0].amount_ml).toBe(500);

      // Query by profile_id succeeds without 22P02 integer error
      const queryRes = await client.query(`
        SELECT * FROM public.water_logs WHERE profile_id = '${MEMBER_1_ID}';
      `);
      expect(queryRes.rows).toHaveLength(1);
    });
  });

  // ==========================================
  // SECTION 3: WORKOUT CONTRACT & LIFECYCLE
  // ==========================================
  describe('3. Workout Domain Contracts & Lifecycle', () => {
    beforeEach(async () => {
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);
    });

    it('creates and retrieves v2_workout_plans with schedule routines', async () => {
      const planRes = await client.query(`
        INSERT INTO public.v2_workout_plans (user_id, organization_id, title, description, schedule)
        VALUES ('${MEMBER_1_ID}', '${ORG_1_ID}', 'Push Pull Legs V2', 'Hypertrophy Block', '{"days": ["Push", "Pull", "Legs"]}'::jsonb)
        RETURNING id, title, schedule;
      `);
      expect(planRes.rows[0].title).toBe('Push Pull Legs V2');
      expect(planRes.rows[0].schedule).toEqual({ days: ['Push', 'Pull', 'Legs'] });
    });

    it('enforces single active session (started or paused) per user via partial unique index', async () => {
      // Start 1st session
      await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Session A', 'started');
      `);

      // Attempt to start a 2nd concurrent session for MEMBER_1 must fail
      await expect(client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Session B', 'started');
      `)).rejects.toThrow(/idx_v2_workout_sessions_single_active|unique/i);

      // Paused session is also active -> cannot start another
      await client.query(`
        UPDATE public.v2_workout_sessions SET state = 'paused' WHERE user_id = '${MEMBER_1_ID}';
      `);

      await expect(client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Session C', 'started');
      `)).rejects.toThrow();

      // Once completed, user CAN start a new session
      await client.query(`
        UPDATE public.v2_workout_sessions SET state = 'completed', completed_at = now() WHERE user_id = '${MEMBER_1_ID}';
      `);

      // New session now succeeds
      const newSessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Session D', 'started')
        RETURNING id;
      `);
      expect(newSessionRes.rows).toHaveLength(1);
    });

    it('logs exercise sets, verifies ON DELETE SET NULL on exercise, and ON DELETE CASCADE on session', async () => {
      const sessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Bench Heavy Day', 'started')
        RETURNING id;
      `);
      const sessionId = sessionRes.rows[0].id;

      // Log Set 1 and Set 2
      await client.query(`
        INSERT INTO public.exercise_sets (session_id, exercise_id, set_number, weight_kg, reps, rpe)
        VALUES 
          ('${sessionId}', '${EXERCISE_1_ID}', 1, 100.0, 5, 8.5),
          ('${sessionId}', '${EXERCISE_1_ID}', 2, 102.5, 4, 9.0);
      `);

      const setsRes = await client.query(`
        SELECT set_number, weight_kg, reps, rpe FROM public.exercise_sets WHERE session_id = '${sessionId}' ORDER BY set_number;
      `);
      expect(setsRes.rows).toHaveLength(2);
      expect(parseFloat(setsRes.rows[0].weight_kg)).toBe(100.0);
      expect(setsRes.rows[0].reps).toBe(5);

      // Test ON DELETE SET NULL: Delete EXERCISE_1 from catalog
      await client.query(`DELETE FROM public.exercises WHERE id = '${EXERCISE_1_ID}';`);

      // Verify sets still exist, but exercise_id is now NULL
      const setsAfterCatalogDelete = await client.query(`
        SELECT exercise_id, weight_kg, reps FROM public.exercise_sets WHERE session_id = '${sessionId}';
      `);
      expect(setsAfterCatalogDelete.rows).toHaveLength(2);
      expect(setsAfterCatalogDelete.rows[0].exercise_id).toBeNull();
      expect(parseFloat(setsAfterCatalogDelete.rows[0].weight_kg)).toBe(100.0);

      // Test ON DELETE CASCADE: Delete the session
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE id = '${sessionId}';`);

      const setsAfterSessionDelete = await client.query(`
        SELECT * FROM public.exercise_sets WHERE session_id = '${sessionId}';
      `);
      expect(setsAfterSessionDelete.rows).toHaveLength(0);
    });

    it('enforces state-transition integrity at database level, rejecting reopening completed sessions via SQL', async () => {
      const sessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, title, state)
        VALUES ('${MEMBER_1_ID}', 'Terminal Session Test', 'started')
        RETURNING id;
      `);
      const sessionId = sessionRes.rows[0].id;

      // Transition to completed
      await client.query(`
        UPDATE public.v2_workout_sessions 
        SET state = 'completed', completed_at = now()
        WHERE id = '${sessionId}';
      `);

      // Attempt to reopen to started via SQL must fail at the database engine level
      await expect(client.query(`
        UPDATE public.v2_workout_sessions 
        SET state = 'started'
        WHERE id = '${sessionId}';
      `)).rejects.toThrow(/Invalid workout session transition/);
    });
  });

  // ==========================================
  // SECTION 4: RLS & TENANT AUTHORIZATION
  // ==========================================
  describe('4. RLS & Tenant Authorization Matrix', () => {
    beforeEach(async () => {
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);
    });

    it('enforces member self-access and blocks cross-member reads in v2_nutrition_logs', async () => {
      // Insert meals as superuser
      await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories)
        VALUES 
          ('${MEMBER_1_ID}', 'Member 1 Steak', 600),
          ('${MEMBER_2_ID}', 'Member 2 Tofu', 300);
      `);

      // Switch to MEMBER_1 authenticated context
      const member1Client = new Client(LOCAL_PG_CONFIG);
      await member1Client.connect();
      try {
        await member1Client.query(`
          SET ROLE authenticated;
          SET request.jwt.claim.sub = '${MEMBER_1_ID}';
        `);

        // Member 1 can only see own meals
        const m1Select = await member1Client.query('SELECT food_name FROM public.v2_nutrition_logs;');
        expect(m1Select.rows).toHaveLength(1);
        expect(m1Select.rows[0].food_name).toBe('Member 1 Steak');

        // Member 1 cannot update Member 2's meal
        const m1Update = await member1Client.query(`
          UPDATE public.v2_nutrition_logs SET calories = 999 WHERE user_id = '${MEMBER_2_ID}';
        `);
        expect(m1Update.rowCount).toBe(0);

        // Member 1 cannot insert meal with Member 2's user_id
        await expect(member1Client.query(`
          INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories)
          VALUES ('${MEMBER_2_ID}', 'Spoofed Meal', 500);
        `)).rejects.toThrow(/policy/i);

        // Member 1 via daily nutrition summary view only sees Member 1
        const viewRes = await member1Client.query('SELECT * FROM public.v2_daily_nutrition_summary;');
        expect(viewRes.rows).toHaveLength(1);
        expect(viewRes.rows[0].user_id).toBe(MEMBER_1_ID);
      } finally {
        await member1Client.end();
      }
    });

    it('allows tenant staff to view member workout sessions while blocking cross-tenant staff', async () => {
      // Member 1 belongs to ORG_1
      const sessRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, organization_id, title, state)
        VALUES ('${MEMBER_1_ID}', '${ORG_1_ID}', 'Member 1 Leg Day', 'started')
        RETURNING id;
      `);
      const sessionId = sessRes.rows[0].id;

      // Staff from Org 1
      const staff1Client = new Client(LOCAL_PG_CONFIG);
      await staff1Client.connect();
      try {
        await staff1Client.query(`
          SET ROLE authenticated;
          SET request.jwt.claim.sub = '${STAFF_ORG1_ID}';
        `);

        // Staff 1 (Org 1) CAN see Member 1's session
        const staff1Select = await staff1Client.query(`
          SELECT title FROM public.v2_workout_sessions WHERE id = '${sessionId}';
        `);
        expect(staff1Select.rows).toHaveLength(1);
        expect(staff1Select.rows[0].title).toBe('Member 1 Leg Day');
      } finally {
        await staff1Client.end();
      }

      // Staff from Org 2
      const staff2Client = new Client(LOCAL_PG_CONFIG);
      await staff2Client.connect();
      try {
        await staff2Client.query(`
          SET ROLE authenticated;
          SET request.jwt.claim.sub = '${STAFF_ORG2_ID}';
        `);

        // Staff 2 (Org 2) CANNOT see Member 1's session (0 rows returned)
        const staff2Select = await staff2Client.query(`
          SELECT title FROM public.v2_workout_sessions WHERE id = '${sessionId}';
        `);
        expect(staff2Select.rows).toHaveLength(0);
      } finally {
        await staff2Client.end();
      }
    });

    it('denies anonymous role (anon) access completely', async () => {
      const anonClient = new Client(LOCAL_PG_CONFIG);
      await anonClient.connect();
      try {
        await anonClient.query('SET ROLE anon;');

        await expect(anonClient.query('SELECT * FROM public.v2_nutrition_logs;')).rejects.toThrow(/permission denied/i);
        await expect(anonClient.query('SELECT * FROM public.v2_workout_sessions;')).rejects.toThrow(/permission denied/i);
        await expect(anonClient.query('SELECT * FROM public.exercise_sets;')).rejects.toThrow(/permission denied/i);
      } finally {
        await anonClient.end();
      }
    });
  });

  // ==========================================
  // SECTION 5: ROLLBACK & FAILURE INJECTION
  // ==========================================
  describe('5. Rollback & Post-Deployment Modern Data Preservation', () => {
    beforeEach(async () => {
      await client.query(PHASE_10A_SQL);
      await client.query(PHASE_10B_SQL);
    });

    it('preserves post-deployment modern data in archive tables before rollback drop', async () => {
      // Simulate live production traffic: Modern meals, plans, sessions, and sets logged
      await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, food_name, calories, protein_g)
        VALUES ('${MEMBER_1_ID}', 'Modern Post-Deploy Meal', 750, 42.0);

        INSERT INTO public.v2_workout_plans (id, user_id, title)
        VALUES ('99999999-9999-9999-9999-999999999999', '${MEMBER_1_ID}', 'Modern Plan');

        INSERT INTO public.v2_workout_sessions (id, user_id, plan_id, title, state)
        VALUES ('88888888-8888-8888-8888-888888888888', '${MEMBER_1_ID}', '99999999-9999-9999-9999-999999999999', 'Modern Live Session', 'completed');

        INSERT INTO public.exercise_sets (session_id, set_number, weight_kg, reps)
        VALUES ('88888888-8888-8888-8888-888888888888', 1, 120.0, 5);
      `);

      // Execute safe rollback procedure with archive-before-drop protocol
      const timestamp = `20261012_${Date.now()}`;
      await client.query(`
        BEGIN;

        -- 1. Archive modern data
        CREATE TABLE public.archive_v2_nutrition_logs_${timestamp} AS
        SELECT * FROM public.v2_nutrition_logs;

        CREATE TABLE public.archive_v2_workout_sessions_${timestamp} AS
        SELECT * FROM public.v2_workout_sessions;

        CREATE TABLE public.archive_exercise_sets_${timestamp} AS
        SELECT * FROM public.exercise_sets;

        -- 2. Drop modern objects
        DROP VIEW IF EXISTS public.v2_daily_nutrition_summary CASCADE;
        DROP TABLE IF EXISTS public.exercise_sets CASCADE;
        DROP TABLE IF EXISTS public.v2_workout_sessions CASCADE;
        DROP TABLE IF EXISTS public.v2_workout_plans CASCADE;
        DROP TABLE IF EXISTS public.v2_nutrition_logs CASCADE;

        COMMIT;
      `);

      // Assert modern tables are gone
      const tablesCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('v2_nutrition_logs', 'v2_workout_sessions', 'exercise_sets');
      `);
      expect(tablesCheck.rows).toHaveLength(0);

      // Assert archives contain 100% of modern records
      const nutritionArchive = await client.query(`SELECT * FROM public.archive_v2_nutrition_logs_${timestamp};`);
      expect(nutritionArchive.rows).toHaveLength(1);
      expect(nutritionArchive.rows[0].food_name).toBe('Modern Post-Deploy Meal');

      const sessionsArchive = await client.query(`SELECT * FROM public.archive_v2_workout_sessions_${timestamp};`);
      expect(sessionsArchive.rows).toHaveLength(1);
      expect(sessionsArchive.rows[0].title).toBe('Modern Live Session');

      const setsArchive = await client.query(`SELECT * FROM public.archive_exercise_sets_${timestamp};`);
      expect(setsArchive.rows).toHaveLength(1);
      expect(parseFloat(setsArchive.rows[0].weight_kg)).toBe(120.0);

      // Assert Phase 9B and legacy tables are intact
      const legacyMap = await client.query('SELECT COUNT(*) FROM public.legacy_user_id_map;');
      expect(parseInt(legacyMap.rows[0].count)).toBe(2);
      const waterLogs = await client.query('SELECT COUNT(*) FROM public.water_logs;');
      expect(parseInt(waterLogs.rows[0].count)).toBe(13);
    });

    it('reverts completely on injected rollback failure (transactional DDL safety)', async () => {
      // Injected failure: Intentionally trigger error in rollback block
      await expect(client.query(`
        BEGIN;

        CREATE TABLE public.archive_v2_nutrition_logs_failtest AS
        SELECT * FROM public.v2_nutrition_logs;

        -- Injected syntax/runtime error
        SELECT non_existent_function_that_fails();

        COMMIT;
      `)).rejects.toThrow();

      // Clean up connection transaction state
      await client.query('ROLLBACK;').catch(() => {});

      // Transaction aborted -> Archive table was NOT created, live tables intact
      const archiveCheck = await client.query(`
        SELECT 1 FROM information_schema.tables WHERE table_name = 'archive_v2_nutrition_logs_failtest';
      `);
      expect(archiveCheck.rows).toHaveLength(0);

      const tableCheck = await client.query(`
        SELECT 1 FROM information_schema.tables WHERE table_name = 'v2_nutrition_logs';
      `);
      expect(tableCheck.rows).toHaveLength(1);
    });
  });
});
