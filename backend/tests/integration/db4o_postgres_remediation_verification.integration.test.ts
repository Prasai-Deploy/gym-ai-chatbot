import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';
import { normalizeOptionalExerciseId, isValidUuid } from '../../src/modules/workout/domain/WorkoutSchemas';

/**
 * STRIVA V2 — DB-4O: Real PostgreSQL 18 Remediation Verification Suite
 *
 * Target: Ephemeral, isolated local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests validate DB-4N findings against live PostgreSQL 18 engine.
 */

const LOCAL_PG_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  database: 'postgres',
};

describe('DB-4O: Real PostgreSQL 18 Integration Verification Suite', () => {
  let client: Client;

  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
  const LEGIT_MEMBER_ID = '99999999-9999-4999-8999-999999999999';
  const VALID_EXERCISE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeAll(async () => {
    client = new Client(LOCAL_PG_CONFIG);
    await client.connect();

    // Verify local PostgreSQL 18 engine
    const versionRes = await client.query('SELECT version()');
    expect(versionRes.rows[0].version).toContain('PostgreSQL 18');

    // Ensure profiles and valid exercise exist
    await client.query(`
      INSERT INTO auth.users (id, email)
      VALUES 
        ('${DEMO_USER_ID}', 'demo@striva.test'),
        ('${LEGIT_MEMBER_ID}', 'legit@striva.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.profiles (id, email, full_name)
      VALUES 
        ('${DEMO_USER_ID}', 'demo@striva.test', 'Demo User'),
        ('${LEGIT_MEMBER_ID}', 'legit@striva.test', 'Legit Member')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.exercises (id, name, slug)
      VALUES 
        ('${VALID_EXERCISE_ID}', 'Incline Barbell Bench Press', 'incline-bench')
      ON CONFLICT (id) DO NOTHING;
    `);
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  beforeEach(async () => {
    await client.query(`
      DELETE FROM public.v2_workout_sessions WHERE user_id IN ('${DEMO_USER_ID}', '${LEGIT_MEMBER_ID}');
      DELETE FROM public.v2_nutrition_logs WHERE user_id IN ('${DEMO_USER_ID}', '${LEGIT_MEMBER_ID}');
    `);
  });

  // =========================================================================
  // FINDING 3 VERIFICATION: Exercise UUID Handling & Normalization in Postgres
  // =========================================================================
  describe('Finding 3: Exercise UUID Normalization & DB Type Safety', () => {
    it('PostgreSQL strictly rejects placeholder non-UUID strings with error 22P02', async () => {
      // Start a workout session for testing
      const sessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${LEGIT_MEMBER_ID}', 'started')
        RETURNING id;
      `);
      const sessionId = sessionRes.rows[0].id;

      // Attempting to insert raw placeholder 'ex-1' as exercise_id MUST fail with 22P02
      let pgError: any = null;
      try {
        await client.query(`
          INSERT INTO public.exercise_sets (session_id, exercise_id, weight_kg, reps)
          VALUES ('${sessionId}', 'ex-1', 80, 10);
        `);
      } catch (err: any) {
        pgError = err;
      }

      expect(pgError).not.toBeNull();
      expect(pgError.code).toBe('22P02'); // invalid_text_representation
      expect(pgError.message).toContain('invalid input syntax for type uuid');

      // Cleanup session
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE id = '${sessionId}';`);
    });

    it('normalized placeholder (null) succeeds cleanly in PostgreSQL foreign key boundary', async () => {
      const sessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${LEGIT_MEMBER_ID}', 'started')
        RETURNING id;
      `);
      const sessionId = sessionRes.rows[0].id;

      // When the UI submits 'ex-1', our canonical helper normalizes it to null
      const rawPlaceholder = 'ex-1';
      const normalizedId = normalizeOptionalExerciseId(rawPlaceholder);
      expect(normalizedId).toBeNull();

      // Inserting with normalized null exercise_id succeeds without 22P02
      const insertRes = await client.query(`
        INSERT INTO public.exercise_sets (session_id, exercise_id, weight_kg, reps, rpe)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, session_id, exercise_id, weight_kg, reps, rpe;
      `, [sessionId, normalizedId, 85, 8, 8]);

      expect(insertRes.rows).toHaveLength(1);
      expect(insertRes.rows[0].exercise_id).toBeNull();
      expect(insertRes.rows[0].session_id).toBe(sessionId);
      expect(Number(insertRes.rows[0].weight_kg)).toBe(85);
      expect(insertRes.rows[0].reps).toBe(8);

      // Cleanup session
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE id = '${sessionId}';`);
    });

    it('valid UUID exercise ID is preserved and links to exercise library in PostgreSQL', async () => {
      const sessionRes = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${LEGIT_MEMBER_ID}', 'started')
        RETURNING id;
      `);
      const sessionId = sessionRes.rows[0].id;

      const normalizedValidId = normalizeOptionalExerciseId(VALID_EXERCISE_ID);
      expect(normalizedValidId).toBe(VALID_EXERCISE_ID);
      expect(isValidUuid(normalizedValidId)).toBe(true);

      const insertRes = await client.query(`
        INSERT INTO public.exercise_sets (session_id, exercise_id, weight_kg, reps, rpe)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, exercise_id;
      `, [sessionId, normalizedValidId, 100, 5, 9]);

      expect(insertRes.rows).toHaveLength(1);
      expect(insertRes.rows[0].exercise_id).toBe(VALID_EXERCISE_ID);

      // Join verification
      const joinRes = await client.query(`
        SELECT s.id, e.name, e.slug
        FROM public.exercise_sets s
        JOIN public.exercises e ON s.exercise_id = e.id
        WHERE s.id = '${insertRes.rows[0].id}';
      `);
      expect(joinRes.rows).toHaveLength(1);
      expect(joinRes.rows[0].name).toBeDefined();
      expect(joinRes.rows[0].id).toBe(insertRes.rows[0].id);

      // Cleanup
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE id = '${sessionId}';`);
    });
  });

  // =========================================================================
  // FINDING 2 VERIFICATION: Demo Reset Dependency-Safe Ordering & Isolation
  // =========================================================================
  describe('Finding 2: Demo Reset Safety & Database Dependency Handling', () => {
    it('executes child-before-parent deletion cleanly and leaves non-demo data intact', async () => {
      // Clean up any lingering sessions or logs from previous test suites
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE user_id IN ('${DEMO_USER_ID}', '${LEGIT_MEMBER_ID}');`);
      await client.query(`DELETE FROM public.v2_nutrition_logs WHERE user_id IN ('${DEMO_USER_ID}', '${LEGIT_MEMBER_ID}');`);

      // 1. Seed demo data
      const demoSess = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${DEMO_USER_ID}', 'completed')
        RETURNING id;
      `);
      const demoSessId = demoSess.rows[0].id;

      await client.query(`
        INSERT INTO public.exercise_sets (session_id, weight_kg, reps)
        VALUES ('${demoSessId}', 60, 10), ('${demoSessId}', 65, 8);
      `);

      await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories)
        VALUES ('${DEMO_USER_ID}', '2026-10-13', 'snack', 'Demo Protein Bar', 220);
      `);

      // 2. Seed legitimate member data
      const legitSess = await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${LEGIT_MEMBER_ID}', 'completed')
        RETURNING id;
      `);
      const legitSessId = legitSess.rows[0].id;

      await client.query(`
        INSERT INTO public.exercise_sets (session_id, weight_kg, reps)
        VALUES ('${legitSessId}', 120, 3), ('${legitSessId}', 125, 2);
      `);

      await client.query(`
        INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories)
        VALUES ('${LEGIT_MEMBER_ID}', '2026-10-13', 'lunch', 'Member Salmon Bowl', 650);
      `);

      // 3. Perform the exact IdentityRepository.resetDemoData sequence:
      // Step A: Find demo sessions
      const foundDemoSessions = await client.query(`
        SELECT id FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';
      `);
      const demoSessionIds = foundDemoSessions.rows.map(r => r.id);
      expect(demoSessionIds).toContain(demoSessId);

      // Step B: Delete child sets first
      if (demoSessionIds.length > 0) {
        await client.query(`
          DELETE FROM public.exercise_sets WHERE session_id = ANY($1::uuid[]);
        `, [demoSessionIds]);
      }

      // Step C: Delete parent demo tables
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';`);
      await client.query(`DELETE FROM public.v2_nutrition_logs WHERE user_id = '${DEMO_USER_ID}';`);

      // 4. Assert demo data is completely gone
      const demoSetsLeft = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${demoSessId}';`);
      const demoSessLeft = await client.query(`SELECT count(*) FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';`);
      const demoNutrLeft = await client.query(`SELECT count(*) FROM public.v2_nutrition_logs WHERE user_id = '${DEMO_USER_ID}';`);

      expect(Number(demoSetsLeft.rows[0].count)).toBe(0);
      expect(Number(demoSessLeft.rows[0].count)).toBe(0);
      expect(Number(demoNutrLeft.rows[0].count)).toBe(0);

      // 5. Assert legitimate member data is 100% untouched
      const legitSetsLeft = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${legitSessId}';`);
      const legitSessLeft = await client.query(`SELECT count(*) FROM public.v2_workout_sessions WHERE user_id = '${LEGIT_MEMBER_ID}';`);
      const legitNutrLeft = await client.query(`SELECT count(*) FROM public.v2_nutrition_logs WHERE user_id = '${LEGIT_MEMBER_ID}';`);

      expect(Number(legitSetsLeft.rows[0].count)).toBe(2);
      expect(Number(legitSessLeft.rows[0].count)).toBe(1);
      expect(Number(legitNutrLeft.rows[0].count)).toBe(1);

      // Cleanup legitimate member session
      await client.query(`DELETE FROM public.v2_workout_sessions WHERE id = '${legitSessId}';`);
      await client.query(`DELETE FROM public.v2_nutrition_logs WHERE user_id = '${LEGIT_MEMBER_ID}';`);
    });
  });
});
