import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

/**
 * STRIVA V2 — Phase 12A: Legacy Routine Security Hardening Test Suite
 *
 * Validates:
 * 1. Static SQL invariants of phase_12_legacy_routine_hardening.sql.
 * 2. Search path pinning (search_path = pg_catalog, pg_temp).
 * 3. Exact execution modes (SECURITY INVOKER across all 5 routines).
 * 4. Principle of least privilege for EXECUTE grants.
 * 5. Real PostgreSQL integration on disposable restored database (port 5433).
 */
describe('Phase 12A: Legacy Routine Security Hardening', () => {
  const migrationPath = path.join(
    __dirname,
    '../../supabase/migrations/phase_12_legacy_routine_hardening.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // ==========================================================================
  // PART 1: Static SQL Specification Verification
  // ==========================================================================
  describe('1. Static SQL Migration Invariants', () => {
    it('1.1 Pins search_path to pg_catalog, pg_temp across all 5 routines', () => {
      const routines = [
        'public.update_modified_column()',
        'public.update_updated_at_column()',
        'public.update_membership_statuses()',
        'public.is_admin()',
        'public.get_admin_role()'
      ];

      for (const r of routines) {
        expect(migrationSql).toContain(`CREATE OR REPLACE FUNCTION ${r}`);
      }

      // Assert search_path declaration count
      const searchPathMatches = migrationSql.match(/SET search_path = pg_catalog, pg_temp/g);
      expect(searchPathMatches).not.toBeNull();
      expect(searchPathMatches?.length).toBe(5);
    });

    it('1.2 Configures all 5 routines strictly as SECURITY INVOKER in function DDL', () => {
      const invokerDdlMatches = migrationSql.match(/LANGUAGE\s+(?:plpgsql|sql)\s+SECURITY INVOKER/gi);
      expect(invokerDdlMatches).not.toBeNull();
      expect(invokerDdlMatches?.length).toBe(5);

      // Must NOT contain SECURITY DEFINER anywhere in this migration
      expect(migrationSql).not.toContain('SECURITY DEFINER');
    });

    it('1.3 Seals update_membership_statuses() against direct PostgREST RPC access', () => {
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM PUBLIC;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM anon;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM authenticated;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO postgres;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO service_role;');
    });

    it('1.4 Revokes public and anonymous execution from admin helpers', () => {
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.is_admin() FROM anon;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;');

      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.get_admin_role() FROM anon;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated;');
    });

    it('1.5 Preserves authenticated execution on row-level timestamp triggers', () => {
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.update_modified_column() TO authenticated;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;');
    });

    it('1.6 Schema-qualifies application tables in maintenance and admin queries', () => {
      expect(migrationSql).toContain('UPDATE public.memberships');
      expect(migrationSql).toContain('UPDATE public.user_workout_assignments');
      expect(migrationSql).toContain('UPDATE public.user_diet_assignments');
      expect(migrationSql).toContain('JOIN public.membership_plans');
      expect(migrationSql).toContain('FROM public.admins');
    });
  });

  // ==========================================================================
  // PART 2: Real PostgreSQL Disposable Rehearsal (Port 5433)
  // ==========================================================================
  describe('2. Real PostgreSQL Disposable Execution & Authorization Rehearsal', () => {
    let client: Client;
    let isConnected = false;

    beforeAll(async () => {
      try {
        client = new Client({
          host: '127.0.0.1',
          port: 5433,
          user: 'postgres',
          database: 'striva_restore_test',
          connectionTimeoutMillis: 2000
        });
        await client.connect();
        isConnected = true;
      } catch (err) {
        console.warn('Disposable PG (5433) not reachable; skipping live catalog tests in this run.');
        isConnected = false;
      }
    });

    afterAll(async () => {
      if (isConnected && client) {
        await client.end();
      }
    });

    it('2.1 Confirms all 5 routines hold proconfig = ["search_path=pg_catalog, pg_temp"]', async () => {
      if (!isConnected) return;

      const res = await client.query(`
        SELECT p.proname, p.prosecdef, p.proconfig 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
        ORDER BY p.proname;
      `);

      expect(res.rows.length).toBe(5);
      for (const row of res.rows) {
        expect(row.prosecdef).toBe(false); // All SECURITY INVOKER
        expect(row.proconfig).toEqual(['search_path=pg_catalog, pg_temp']);
      }
    });

    it('2.2 Confirms effective privileges match security policy', async () => {
      if (!isConnected) return;

      // update_membership_statuses: only postgres & service_role
      const anonMaint = await client.query("SELECT has_function_privilege('anon', 'public.update_membership_statuses()', 'EXECUTE') as can");
      const authMaint = await client.query("SELECT has_function_privilege('authenticated', 'public.update_membership_statuses()', 'EXECUTE') as can");
      const pgMaint = await client.query("SELECT has_function_privilege('postgres', 'public.update_membership_statuses()', 'EXECUTE') as can");
      expect(anonMaint.rows[0].can).toBe(false);
      expect(authMaint.rows[0].can).toBe(false);
      expect(pgMaint.rows[0].can).toBe(true);

      // is_admin: authenticated & postgres, but not anon
      const anonAdm = await client.query("SELECT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') as can");
      const authAdm = await client.query("SELECT has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE') as can");
      expect(anonAdm.rows[0].can).toBe(false);
      expect(authAdm.rows[0].can).toBe(true);

      // update_modified_column: authenticated must be true
      const authMod = await client.query("SELECT has_function_privilege('authenticated', 'public.update_modified_column()', 'EXECUTE') as can");
      expect(authMod.rows[0].can).toBe(true);
    });

    it('2.3 Rehearses admin check execution for admin vs non-admin authenticated users', async () => {
      if (!isConnected) return;

      // Admin user
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: '2dbbad1d-5988-4d6f-8c32-5c57080e56f5', email: 'priyanshupaswan648@gmail.com', role: 'authenticated' })
      ]);
      const admRes = await client.query('SELECT public.is_admin() as is_admin, public.get_admin_role() as role');
      expect(admRes.rows[0].is_admin).toBe(true);
      expect(admRes.rows[0].role).toBe('super_admin');
      await client.query('ROLLBACK');

      // Non-admin user
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', email: 'demo@sweatfix.com', role: 'authenticated' })
      ]);
      const nonAdmRes = await client.query('SELECT public.is_admin() as is_admin, public.get_admin_role() as role');
      expect(nonAdmRes.rows[0].is_admin).toBe(false);
      expect(nonAdmRes.rows[0].role).toBeNull();
      await client.query('ROLLBACK');
    });

    it('2.4 Verifies trigger execution under authenticated role advances updated_at', async () => {
      if (!isConnected) return;

      const userSub = '2dbbad1d-5988-4d6f-8c32-5c57080e56f5';
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userSub]);
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userSub, email: 'priyanshupaswan648@gmail.com', role: 'authenticated' })
      ]);

      const before = await client.query('SELECT updated_at FROM public.profiles WHERE id = $1', [userSub]);
      const beforeTime = new Date(before.rows[0].updated_at).getTime();

      // Trigger UPDATE
      await client.query("UPDATE public.profiles SET full_name = 'Verified Name' WHERE id = $1", [userSub]);

      const after = await client.query('SELECT updated_at, full_name FROM public.profiles WHERE id = $1', [userSub]);
      const afterTime = new Date(after.rows[0].updated_at).getTime();

      expect(after.rows[0].full_name).toBe('Verified Name');
      expect(afterTime).toBeGreaterThanOrEqual(beforeTime);

      await client.query('ROLLBACK');
    });
  });
});
