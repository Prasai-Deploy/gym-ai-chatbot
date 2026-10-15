import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * STRIVA V2 — DB-2 Phase 1F: Real PostgreSQL Integration Suite
 * 
 * Target: Disposable, isolated local PostgreSQL 18 instance running on 127.0.0.1:5433
 * Zero remote connections. All tests execute real PostgreSQL queries, DDL, DML,
 * advisory locks, RLS evaluations, and error handling.
 */

const testDbUrl = process.env.TEST_DATABASE_URL;
const isDisposablePgConfigured = Boolean(testDbUrl);

const getLocalPgConfig = () => {
  if (testDbUrl) {
    try {
      const u = new URL(testDbUrl);
      return {
        host: u.hostname || '127.0.0.1',
        port: parseInt(u.port || '5433', 10),
        user: u.username || 'postgres',
        password: u.password || undefined,
        database: u.pathname ? u.pathname.replace(/^\//, '') : 'postgres',
      };
    } catch {
      return {
        host: '127.0.0.1',
        port: 5433,
        user: 'postgres',
        database: 'postgres',
      };
    }
  }
  return {
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    database: 'postgres',
  };
};

const LOCAL_PG_CONFIG = getLocalPgConfig();

const MIGRATION_LOCK_KEY = '746291048201582';
const MIGRATION_FILE = path.join(__dirname, '../../supabase/migrations/phase_9a_rls_recursion_fix.sql');
const MIGRATION_SQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');

describe.skipIf(!isDisposablePgConfigured)('DB-2 Phase 1F: Real PostgreSQL 18 Disposable Validation Suite', () => {
  let masterClient: Client;

  beforeAll(async () => {
    masterClient = new Client(LOCAL_PG_CONFIG);
    await masterClient.connect();

    // Verify PostgreSQL version
    const versionRes = await masterClient.query('SELECT version()');
    expect(versionRes.rows[0].version).toContain('PostgreSQL 18');

    // Create required auxiliary roles and auth schema on disposable database
    await masterClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'test_app_user') THEN
          CREATE ROLE test_app_user LOGIN;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$ LANGUAGE sql STABLE;

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, test_app_user;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, test_app_user;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role, test_app_user;
    `);
  });

  afterAll(async () => {
    await masterClient.end();
  });

  // ==========================================================================
  // SECTION 1: VALIDATE THE TRANSACTION-SCOPED ADVISORY LOCK
  // ==========================================================================
  describe('1. Transaction-Scoped Advisory Lock Concurrency Validation', () => {
    it('Session A acquires advisory lock; Session B is blocked until A commits', async () => {
      const clientA = new Client(LOCAL_PG_CONFIG);
      const clientB = new Client(LOCAL_PG_CONFIG);
      await clientA.connect();
      await clientB.connect();

      try {
        // Session A starts transaction and acquires lock
        await clientA.query('BEGIN');
        await clientA.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

        // Session B attempts immediate try-lock; must return false
        const tryLockRes = await clientB.query('SELECT pg_try_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
        expect(tryLockRes.rows[0].pg_try_advisory_xact_lock).toBe(false);

        // Session B begins transaction and waits for lock
        await clientB.query('BEGIN');
        let sessionBAcquiredLock = false;

        const sessionBLockPromise = clientB.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY])
          .then(() => {
            sessionBAcquiredLock = true;
          });

        // Small delay to verify B is truly blocked while A is open
        await new Promise(r => setTimeout(r, 100));
        expect(sessionBAcquiredLock).toBe(false);

        // Session A commits; releases lock
        await clientA.query('COMMIT');

        // Session B should now unblock and acquire lock
        await sessionBLockPromise;
        expect(sessionBAcquiredLock).toBe(true);

        await clientB.query('COMMIT');
      } finally {
        await clientA.end();
        await clientB.end();
      }
    });

    it('Failed transaction in Session A automatically releases advisory lock via ROLLBACK', async () => {
      const clientA = new Client(LOCAL_PG_CONFIG);
      const clientB = new Client(LOCAL_PG_CONFIG);
      await clientA.connect();
      await clientB.connect();

      try {
        await clientA.query('BEGIN');
        await clientA.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

        // Verify B cannot acquire lock while A is in transaction
        const tryRes1 = await clientB.query('SELECT pg_try_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
        expect(tryRes1.rows[0].pg_try_advisory_xact_lock).toBe(false);

        // Session A encounters error and issues ROLLBACK
        await clientA.query('ROLLBACK');

        // Session B can now immediately acquire the lock
        await clientB.query('BEGIN');
        const tryRes2 = await clientB.query('SELECT pg_try_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
        expect(tryRes2.rows[0].pg_try_advisory_xact_lock).toBe(true);
        await clientB.query('COMMIT');
      } finally {
        await clientA.end();
        await clientB.end();
      }
    });
  });

  // ==========================================================================
  // SECTION 2: VALIDATE PHASE 9A MIGRATION BEHAVIOR & RLS RECURSION ELIMINATION
  // ==========================================================================
  describe('2. Phase 9A Migration & RLS Execution against Real PostgreSQL Engine', () => {
    beforeAll(async () => {
      // Setup minimum clean schema
      await masterClient.query(`
        DROP TABLE IF EXISTS public.organization_members CASCADE;
        DROP TABLE IF EXISTS public.organizations CASCADE;
        DROP FUNCTION IF EXISTS public.is_org_manager(UUID) CASCADE;
        DROP FUNCTION IF EXISTS public.is_org_member(UUID) CASCADE;

        CREATE TABLE public.organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          owner_id UUID
        );

        CREATE TABLE public.organization_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active'
        );

        ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

        -- Helper is_org_member for SELECT policy
        CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
        RETURNS BOOLEAN AS $$
          SELECT EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = target_org_id AND om.user_id = auth.uid()
          );
        $$ LANGUAGE sql STABLE SECURITY DEFINER;

        -- Create member view policy
        CREATE POLICY "Members view tenant memberships" ON public.organization_members
          FOR SELECT TO authenticated, test_app_user
          USING ( public.is_org_member(organization_id) );

        GRANT ALL ON TABLE public.organizations TO postgres, test_app_user;
        GRANT ALL ON TABLE public.organization_members TO postgres, test_app_user;
      `);
    });

    it('REAL PG VERIFICATION: Legacy Phase 8B policy reproduces Error 42P17 (infinite recursion detected)', async () => {
      // 1. Create legacy recursive policy from Phase 8B
      await masterClient.query(`
        DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;

        CREATE POLICY "Staff managers manage organization members" ON public.organization_members
          FOR ALL TO test_app_user, authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.organization_members om
              WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
            ) OR EXISTS (
              SELECT 1 FROM public.organizations o
              WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid()
            )
          );
      `);

      // 2. Querying as non-superuser role test_app_user triggers error 42P17
      const appClient = new Client(LOCAL_PG_CONFIG);
      await appClient.connect();

      let recursionErrorCaught = false;
      let errorCode = '';

      try {
        await appClient.query(`SET ROLE test_app_user;`);
        await appClient.query(`SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`);
        await appClient.query(`SELECT * FROM public.organization_members;`);
      } catch (err: any) {
        recursionErrorCaught = true;
        errorCode = err.code;
      } finally {
        await appClient.end();
      }

      expect(recursionErrorCaught).toBe(true);
      expect(errorCode).toBe('42P17'); // 42P17: infinite_recursion
    });

    it('REAL PG VERIFICATION: Phase 9A migration executes cleanly and eliminates Error 42P17', async () => {
      // Apply the actual canonical migration file
      await masterClient.query('BEGIN');
      await masterClient.query(MIGRATION_SQL);
      await masterClient.query('COMMIT');

      // Verify function was created
      const funcRes = await masterClient.query(`
        SELECT p.proname, p.prosecdef, p.proconfig, r.rolname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles r ON r.oid = p.proowner
        WHERE n.nspname = 'public' AND p.proname = 'is_org_manager';
      `);
      expect(funcRes.rows.length).toBe(1);
      expect(funcRes.rows[0].prosecdef).toBe(true);
      expect(funcRes.rows[0].proconfig).toEqual(['search_path=pg_catalog, pg_temp']);

      // Querying as non-superuser test_app_user now succeeds with ZERO 42P17 recursion!
      const appClient = new Client(LOCAL_PG_CONFIG);
      await appClient.connect();

      try {
        await appClient.query(`GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO test_app_user;`);
        await appClient.query(`SET ROLE test_app_user;`);
        await appClient.query(`SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`);
        const queryRes = await appClient.query(`SELECT * FROM public.organization_members;`);
        expect(queryRes.rows).toEqual([]);
      } finally {
        await appClient.end();
      }
    });

    it('REAL PG VERIFICATION: Preflight Gate 1 fails and rolls back cleanly when prerequisites are missing', async () => {
      const client = new Client(LOCAL_PG_CONFIG);
      await client.connect();

      try {
        await client.query('BEGIN');
        // Rename column to violate prerequisite
        await client.query('ALTER TABLE public.organizations RENAME COLUMN owner_id TO temp_col');

        let gate1Failed = false;
        try {
          await client.query(MIGRATION_SQL);
        } catch (err: any) {
          gate1Failed = true;
          expect(err.message).toContain('Preflight verification failed: public.organizations.owner_id column does not exist');
        }
        expect(gate1Failed).toBe(true);

        await client.query('ROLLBACK');

        // Verify column was rolled back
        const checkCol = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'owner_id';
        `);
        expect(checkCol.rows.length).toBe(1);
      } finally {
        await client.end();
      }
    });

    it('REAL PG VERIFICATION: Gate 4 fails and rolls back when function owner cannot bypass RLS on FORCE RLS table', async () => {
      const client = new Client(LOCAL_PG_CONFIG);
      await client.connect();

      try {
        await client.query('BEGIN');

        // Create table owned by test_app_user with FORCE RLS
        await client.query(`
          DROP TABLE IF EXISTS public.organization_members CASCADE;
          CREATE TABLE public.organization_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id),
            user_id UUID NOT NULL,
            role TEXT NOT NULL
          );
          ALTER TABLE public.organization_members OWNER TO test_app_user;
          ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;
        `);

        // Create is_org_manager owned by test_app_user (which has no rolbypassrls)
        await client.query(`
          CREATE OR REPLACE FUNCTION public.is_org_manager(target_org_id UUID) RETURNS BOOLEAN AS $$
            SELECT false;
          $$ LANGUAGE sql;
          ALTER FUNCTION public.is_org_manager(target_org_id UUID) OWNER TO test_app_user;
        `);

        // Executing Phase 9A migration must be caught by Gate 4!
        let gate4Failed = false;
        try {
          await client.query(MIGRATION_SQL);
        } catch (err: any) {
          gate4Failed = true;
          expect(err.message).toContain('Safety Gate Abort: Function public.is_org_manager is owned by role');
          expect(err.message).toContain('relforcerowsecurity: t');
        }
        expect(gate4Failed).toBe(true);

        await client.query('ROLLBACK');
      } finally {
        await client.end();
      }
    });

    it('REAL PG VERIFICATION: Full Cross-Tenant RBAC Authorization Matrix with real SQL DML & DQL', async () => {
      // Re-apply canonical migration cleanly
      await masterClient.query(`
        DROP TABLE IF EXISTS public.organization_members CASCADE;
        DROP TABLE IF EXISTS public.organizations CASCADE;

        CREATE TABLE public.organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          owner_id UUID
        );

        CREATE TABLE public.organization_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active'
        );

        ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON TABLE public.organizations TO postgres, test_app_user, authenticated;
        GRANT ALL ON TABLE public.organization_members TO postgres, test_app_user, authenticated;
        GRANT authenticated TO test_app_user;
      `);

      await masterClient.query(MIGRATION_SQL);
      await masterClient.query(`GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO test_app_user;`);

      // Seed test data
      const orgAId = 'a0000000-0000-0000-0000-000000000001';
      const orgBId = 'b0000000-0000-0000-0000-000000000002';
      const userOwnerA = '10000000-0000-0000-0000-000000000001';
      const userManagerA = '10000000-0000-0000-0000-000000000002';
      const userMemberA = '10000000-0000-0000-0000-000000000003';
      const userOwnerB = '20000000-0000-0000-0000-000000000001';

      await masterClient.query(`
        INSERT INTO public.organizations (id, name, owner_id) VALUES
          ('${orgAId}', 'Alpha Gym', '${userOwnerA}'),
          ('${orgBId}', 'Beta Fitness', '${userOwnerB}');

        INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
          ('${orgAId}', '${userOwnerA}', 'Organization Owner'),
          ('${orgAId}', '${userManagerA}', 'Gym Manager'),
          ('${orgAId}', '${userMemberA}', 'Member'),
          ('${orgBId}', '${userOwnerB}', 'Organization Owner');
      `);

      const testClient = new Client(LOCAL_PG_CONFIG);
      await testClient.connect();

      try {
        await testClient.query(`SET ROLE authenticated;`);

        // 1. Unauthenticated (no jwt sub claim) -> CANNOT insert or update
        await testClient.query(`SET request.jwt.claim.sub = '';`);
        let unauthFailed = false;
        try {
          await testClient.query(`
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES ('${orgAId}', '30000000-0000-0000-0000-000000000001', 'Member');
          `);
        } catch {
          unauthFailed = true;
        }
        expect(unauthFailed).toBe(true);

        // 2. Direct Owner of Org A -> Can manage Org A
        await testClient.query(`SET request.jwt.claim.sub = '${userOwnerA}';`);
        const insertResA = await testClient.query(`
          INSERT INTO public.organization_members (organization_id, user_id, role)
          VALUES ('${orgAId}', '30000000-0000-0000-0000-000000000001', 'Trainer')
          RETURNING id;
        `);
        expect(insertResA.rows.length).toBe(1);

        // 3. Cross-Tenant Denial: Owner of Org A cannot manage Org B
        let crossTenantFailed = false;
        try {
          await testClient.query(`
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES ('${orgBId}', '30000000-0000-0000-0000-000000000002', 'Trainer');
          `);
        } catch {
          crossTenantFailed = true;
        }
        expect(crossTenantFailed).toBe(true);

        // 4. Gym Manager of Org A -> Can manage members in Org A
        await testClient.query(`SET request.jwt.claim.sub = '${userManagerA}';`);
        const insertResMgr = await testClient.query(`
          INSERT INTO public.organization_members (organization_id, user_id, role)
          VALUES ('${orgAId}', '40000000-0000-0000-0000-000000000001', 'Member')
          RETURNING id;
        `);
        expect(insertResMgr.rows.length).toBe(1);

        // 5. Normal Member of Org A -> DENIED management mutations
        await testClient.query(`SET request.jwt.claim.sub = '${userMemberA}';`);
        let memberMutationFailed = false;
        try {
          await testClient.query(`
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES ('${orgAId}', '50000000-0000-0000-0000-000000000001', 'Member');
          `);
        } catch {
          memberMutationFailed = true;
        }
        expect(memberMutationFailed).toBe(true);
      } finally {
        await testClient.end();
      }
    });
  });

  // ==========================================================================
  // SECTION 3: VALIDATE RUNNER CONCURRENCY AND HISTORY TRACKING
  // ==========================================================================
  describe('3. Runner Concurrency and Migration History Serialization', () => {
    beforeAll(async () => {
      await masterClient.query(`
        DROP TABLE IF EXISTS public._migrations;
        CREATE TABLE public._migrations (
          name VARCHAR,
          run_at TIMESTAMPTZ
        );
      `);
    });

    it('REAL PG VERIFICATION: Two concurrent runner sessions serialize via advisory lock; exactly one applies migration', async () => {
      const runnerA = new Client(LOCAL_PG_CONFIG);
      const runnerB = new Client(LOCAL_PG_CONFIG);
      await runnerA.connect();
      await runnerB.connect();

      let ddlApplyCount = 0;

      const executeRunnerWorkflow = async (runnerClient: Client, runnerName: string) => {
        await runnerClient.query('BEGIN');
        await runnerClient.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

        // Read history inside lock
        const res = await runnerClient.query('SELECT name FROM public._migrations');
        const applied = new Set(res.rows.map(r => r.name));

        if (!applied.has('phase_9a_rls_recursion_fix.sql')) {
          ddlApplyCount++;
          // Simulate DDL execution
          await runnerClient.query(MIGRATION_SQL);
          await runnerClient.query('INSERT INTO public._migrations (name, run_at) VALUES ($1, NOW())', [
            'phase_9a_rls_recursion_fix.sql',
          ]);
        }

        await runnerClient.query('COMMIT');
      };

      try {
        // Execute Runner A and Runner B concurrently
        await Promise.all([
          executeRunnerWorkflow(runnerA, 'RunnerA'),
          executeRunnerWorkflow(runnerB, 'RunnerB'),
        ]);

        // Exactly one runner applied DDL
        expect(ddlApplyCount).toBe(1);

        // Exactly one history record committed
        const migRes = await masterClient.query('SELECT name FROM public._migrations WHERE name = $1', [
          'phase_9a_rls_recursion_fix.sql',
        ]);
        expect(migRes.rows.length).toBe(1);
      } finally {
        await runnerA.end();
        await runnerB.end();
      }
    });

    it('REAL PG VERIFICATION: Forced runner failure rolls back and records zero history', async () => {
      const client = new Client(LOCAL_PG_CONFIG);
      await client.connect();

      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

        // Insert uncommitted history
        await client.query('INSERT INTO public._migrations (name, run_at) VALUES ($1, NOW())', [
          'faulty_migration.sql',
        ]);

        // Simulate failure
        let failed = false;
        try {
          await client.query('SELECT * FROM non_existent_table_triggering_syntax_error');
        } catch {
          failed = true;
          await client.query('ROLLBACK');
        }
        expect(failed).toBe(true);

        // Verify zero records exist in history table
        const checkRes = await masterClient.query('SELECT name FROM public._migrations WHERE name = $1', [
          'faulty_migration.sql',
        ]);
        expect(checkRes.rows.length).toBe(0);
      } finally {
        await client.end();
      }
    });
  });
});
