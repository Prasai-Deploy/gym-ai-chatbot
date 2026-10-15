import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

/**
 * STRIVA V2 — DB-4L: Real PostgreSQL 18 Remediation Validation Suite
 *
 * Target: Ephemeral, isolated local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests validate DB-4L remediations against real PostgreSQL.
 */

const LOCAL_PG_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  database: 'postgres',
};

describe('DB-4L: Real PostgreSQL 18 Remediation Validation Suite', () => {
  let client: Client;

  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
  const LEGIT_MEMBER_ID = '99999999-9999-4999-8999-999999999999';
  const ORG_ID = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    client = new Client(LOCAL_PG_CONFIG);
    await client.connect();

    // Verify local PostgreSQL version
    const versionRes = await client.query('SELECT version()');
    expect(versionRes.rows[0].version).toContain('PostgreSQL 18');

    // Ensure test users exist in auth.users and profiles
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES 
        ('${DEMO_USER_ID}', 'demo@striva.test', '{"role":"member"}'::jsonb),
        ('${LEGIT_MEMBER_ID}', 'legit@striva.test', '{"role":"member"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.profiles (id, email, full_name)
      VALUES 
        ('${DEMO_USER_ID}', 'demo@striva.test', 'Demo User'),
        ('${LEGIT_MEMBER_ID}', 'legit@striva.test', 'Legit Member')
      ON CONFLICT (id) DO NOTHING;
    `);
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // =========================================================================
  // TEST 1: Nutrition Multi-Meal Logging Without Conflict
  // =========================================================================
  it('allows multiple meals on the same date for the same member without upsert/unique violation', async () => {
    const today = '2026-10-12';

    // Insert Meal 1 (Breakfast)
    const meal1Res = await client.query(`
      INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories, protein_g, carbs_g, fats_g)
      VALUES ('${LEGIT_MEMBER_ID}', '${today}', 'breakfast', 'Oatmeal & Protein Shake', 450, 35, 55, 8)
      RETURNING id, food_name;
    `);
    expect(meal1Res.rows).toHaveLength(1);

    // Insert Meal 2 (Lunch) on the EXACT same date for the same user
    const meal2Res = await client.query(`
      INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories, protein_g, carbs_g, fats_g)
      VALUES ('${LEGIT_MEMBER_ID}', '${today}', 'lunch', 'Grilled Chicken Salad', 600, 48, 40, 18)
      RETURNING id, food_name;
    `);
    expect(meal2Res.rows).toHaveLength(1);

    // Insert Meal 3 (Snack) on the EXACT same date
    const meal3Res = await client.query(`
      INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories, protein_g, carbs_g, fats_g)
      VALUES ('${LEGIT_MEMBER_ID}', '${today}', 'snack', 'Almonds & Greek Yogurt', 250, 20, 15, 12)
      RETURNING id, food_name;
    `);
    expect(meal3Res.rows).toHaveLength(1);

    // Query meals for this user and date
    const allMeals = await client.query(`
      SELECT meal_type, food_name, calories FROM public.v2_nutrition_logs
      WHERE user_id = '${LEGIT_MEMBER_ID}' AND date = '${today}'
      ORDER BY created_at ASC;
    `);
    expect(allMeals.rows.length).toBeGreaterThanOrEqual(3);

    // Verify view aggregation includes all meals
    const summary = await client.query(`
      SELECT total_calories, meal_count FROM public.v2_daily_nutrition_summary
      WHERE user_id = '${LEGIT_MEMBER_ID}' AND date = '${today}';
    `);
    expect(summary.rows).toHaveLength(1);
    expect(Number(summary.rows[0].meal_count)).toBeGreaterThanOrEqual(3);
    expect(Number(summary.rows[0].total_calories)).toBeGreaterThanOrEqual(1300);
  });

  // =========================================================================
  // TEST 2: Demo Data Reset Hardening & Cross-User Isolation
  // =========================================================================
  it('resets demo data cleanly in dependency order while leaving other member data untouched', async () => {
    // 1. Seed demo user data across all modern tables
    const demoPlan = await client.query(`
      INSERT INTO public.v2_workout_plans (user_id, title, description, schedule)
      VALUES ('${DEMO_USER_ID}', 'Demo Plan', 'Plan for demo user', '{"days":[]}'::jsonb)
      RETURNING id;
    `);
    const demoPlanId = demoPlan.rows[0].id;

    const demoSession = await client.query(`
      INSERT INTO public.v2_workout_sessions (user_id, plan_id, state)
      VALUES ('${DEMO_USER_ID}', '${demoPlanId}', 'completed')
      RETURNING id;
    `);
    const demoSessionId = demoSession.rows[0].id;

    await client.query(`
      INSERT INTO public.exercise_sets (session_id, set_number, weight_kg, reps, status)
      VALUES 
        ('${demoSessionId}', 1, 80, 10, 'completed'),
        ('${demoSessionId}', 2, 85, 8, 'completed');
    `);

    await client.query(`
      INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories)
      VALUES ('${DEMO_USER_ID}', '2026-10-12', 'lunch', 'Demo Meal', 500);
    `);

    await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('${DEMO_USER_ID}', 500);
    `);

    // 2. Seed legitimate member data across all modern tables
    const legitPlan = await client.query(`
      INSERT INTO public.v2_workout_plans (user_id, title, description, schedule)
      VALUES ('${LEGIT_MEMBER_ID}', 'Legit Plan', 'Plan for real member', '{"days":[]}'::jsonb)
      RETURNING id;
    `);
    const legitPlanId = legitPlan.rows[0].id;

    const legitSession = await client.query(`
      INSERT INTO public.v2_workout_sessions (user_id, plan_id, state)
      VALUES ('${LEGIT_MEMBER_ID}', '${legitPlanId}', 'completed')
      RETURNING id;
    `);
    const legitSessionId = legitSession.rows[0].id;

    await client.query(`
      INSERT INTO public.exercise_sets (session_id, set_number, weight_kg, reps, status)
      VALUES 
        ('${legitSessionId}', 1, 100, 5, 'completed'),
        ('${legitSessionId}', 2, 105, 5, 'completed');
    `);

    await client.query(`
      INSERT INTO public.v2_nutrition_logs (user_id, date, meal_type, food_name, calories)
      VALUES ('${LEGIT_MEMBER_ID}', '2026-10-12', 'dinner', 'Steak & Potatoes', 800);
    `);

    await client.query(`
      INSERT INTO public.water_logs (profile_id, amount_ml)
      VALUES ('${LEGIT_MEMBER_ID}', 750);
    `);

    // Verify initial counts before reset
    const demoSetsBefore = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${demoSessionId}';`);
    const legitSetsBefore = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${legitSessionId}';`);
    expect(Number(demoSetsBefore.rows[0].count)).toBe(2);
    expect(Number(legitSetsBefore.rows[0].count)).toBe(2);

    // 3. Execute exact IdentityRepository.resetDemoData logic for DEMO_USER_ID
    // Step A: Find demo sessions
    const sessionsRes = await client.query(`
      SELECT id FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';
    `);
    const demoSessionIds = sessionsRes.rows.map(r => r.id);

    // Step B: Delete child exercise_sets
    if (demoSessionIds.length > 0) {
      await client.query(`
        DELETE FROM public.exercise_sets WHERE session_id = ANY($1::uuid[]);
      `, [demoSessionIds]);
    }

    // Step C: Delete parent sessions, plans, nutrition, water strictly scoped to DEMO_USER_ID
    await client.query(`DELETE FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';`);
    await client.query(`DELETE FROM public.v2_workout_plans WHERE user_id = '${DEMO_USER_ID}';`);
    await client.query(`DELETE FROM public.v2_nutrition_logs WHERE user_id = '${DEMO_USER_ID}';`);
    await client.query(`DELETE FROM public.water_logs WHERE profile_id = '${DEMO_USER_ID}';`);

    // 4. Assert all DEMO records are cleanly removed
    const demoSessionsAfter = await client.query(`SELECT count(*) FROM public.v2_workout_sessions WHERE user_id = '${DEMO_USER_ID}';`);
    const demoPlansAfter = await client.query(`SELECT count(*) FROM public.v2_workout_plans WHERE user_id = '${DEMO_USER_ID}';`);
    const demoNutritionAfter = await client.query(`SELECT count(*) FROM public.v2_nutrition_logs WHERE user_id = '${DEMO_USER_ID}';`);
    const demoWaterAfter = await client.query(`SELECT count(*) FROM public.water_logs WHERE profile_id = '${DEMO_USER_ID}';`);
    const demoSetsAfter = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${demoSessionId}';`);

    expect(Number(demoSessionsAfter.rows[0].count)).toBe(0);
    expect(Number(demoPlansAfter.rows[0].count)).toBe(0);
    expect(Number(demoNutritionAfter.rows[0].count)).toBe(0);
    expect(Number(demoWaterAfter.rows[0].count)).toBe(0);
    expect(Number(demoSetsAfter.rows[0].count)).toBe(0);

    // 5. Assert all LEGITIMATE member records remain completely untouched!
    const legitSessionsAfter = await client.query(`SELECT count(*) FROM public.v2_workout_sessions WHERE user_id = '${LEGIT_MEMBER_ID}';`);
    const legitPlansAfter = await client.query(`SELECT count(*) FROM public.v2_workout_plans WHERE user_id = '${LEGIT_MEMBER_ID}';`);
    const legitNutritionAfter = await client.query(`SELECT count(*) FROM public.v2_nutrition_logs WHERE user_id = '${LEGIT_MEMBER_ID}';`);
    const legitWaterAfter = await client.query(`SELECT count(*) FROM public.water_logs WHERE profile_id = '${LEGIT_MEMBER_ID}';`);
    const legitSetsAfter = await client.query(`SELECT count(*) FROM public.exercise_sets WHERE session_id = '${legitSessionId}';`);

    expect(Number(legitSessionsAfter.rows[0].count)).toBe(1);
    expect(Number(legitPlansAfter.rows[0].count)).toBe(1);
    expect(Number(legitNutritionAfter.rows[0].count)).toBeGreaterThanOrEqual(1);
    expect(Number(legitWaterAfter.rows[0].count)).toBeGreaterThanOrEqual(1);
    expect(Number(legitSetsAfter.rows[0].count)).toBe(2);
  });

  // =========================================================================
  // TEST 3: Workout Single Active Session Constraint
  // =========================================================================
  it('enforces single active workout session per user via partial unique index', async () => {
    // Member starts session 1
    const s1 = await client.query(`
      INSERT INTO public.v2_workout_sessions (user_id, state)
      VALUES ('${LEGIT_MEMBER_ID}', 'started')
      RETURNING id, state;
    `);
    expect(s1.rows).toHaveLength(1);

    // Starting a second active session while first is active MUST fail with 23505
    let conflictError: any = null;
    try {
      await client.query(`
        INSERT INTO public.v2_workout_sessions (user_id, state)
        VALUES ('${LEGIT_MEMBER_ID}', 'started')
        RETURNING id, state;
      `);
    } catch (err: any) {
      conflictError = err;
    }

    expect(conflictError).not.toBeNull();
    expect(conflictError.code).toBe('23505'); // unique_violation

    // Completing session 1 allows starting a new session
    await client.query(`
      UPDATE public.v2_workout_sessions
      SET state = 'completed', completed_at = NOW()
      WHERE id = '${s1.rows[0].id}';
    `);

    const s2 = await client.query(`
      INSERT INTO public.v2_workout_sessions (user_id, state)
      VALUES ('${LEGIT_MEMBER_ID}', 'started')
      RETURNING id, state;
    `);
    expect(s2.rows).toHaveLength(1);

    // Clean up
    await client.query(`DELETE FROM public.v2_workout_sessions WHERE user_id = '${LEGIT_MEMBER_ID}';`);
  });
});
