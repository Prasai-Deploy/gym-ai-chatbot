import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  validateStagingDatabaseUrl,
  EXPECTED_STAGING_HOST,
  EXPECTED_STAGING_PROJECT_REF,
  migrations,
  MIGRATION_ADVISORY_LOCK_KEY
} from '../../scripts/apply_staging_migrations.js';

describe('STRIVA V2 — DB-5K: Staging Migration Runner Target Guard Suite', () => {
  const VALID_STAGING_URL = 'postgresql://postgres:super_secret_pw@db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres';
  const VALID_STAGING_URL_ALT_SCHEME = 'postgres://postgres:super_secret_pw@db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres';

  // --------------------------------------------------------------------------
  // PART 1: VALID STAGING HOST ACCEPTANCE
  // --------------------------------------------------------------------------
  describe('Part 1: Valid Staging Host Acceptance', () => {
    it('TEST 1: Accepts canonical staging database URL with postgresql scheme', () => {
      const result = validateStagingDatabaseUrl(VALID_STAGING_URL);
      expect(result).toBeDefined();
      expect(result.host).toBe(EXPECTED_STAGING_HOST);
      expect(result.projectRef).toBe(EXPECTED_STAGING_PROJECT_REF);
      expect(result.port).toBe('5432');
    });

    it('TEST 2: Accepts canonical staging database URL with postgres scheme', () => {
      const result = validateStagingDatabaseUrl(VALID_STAGING_URL_ALT_SCHEME);
      expect(result).toBeDefined();
      expect(result.host).toBe(EXPECTED_STAGING_HOST);
      expect(result.projectRef).toBe(EXPECTED_STAGING_PROJECT_REF);
    });

    it('TEST 3: Returns exact project reference ymrblyiwohvxptiqjfsi and expected host', () => {
      const result = validateStagingDatabaseUrl(VALID_STAGING_URL);
      expect(result.projectRef).toBe('ymrblyiwohvxptiqjfsi');
      expect(result.host).toBe('db.ymrblyiwohvxptiqjfsi.supabase.co');
    });
  });

  // --------------------------------------------------------------------------
  // PART 2: UNAUTHORIZED, PRODUCTION, AND ALTERNATE HOST REJECTION
  // --------------------------------------------------------------------------
  describe('Part 2: Production & Alternate Host Rejection', () => {
    it('TEST 4: Rejects production host and never exposes credentials in error', () => {
      const prodUrl = 'postgresql://admin:super_secret_production_password@db.production-prod-ref.supabase.co:5432/postgres';
      expect(() => validateStagingDatabaseUrl(prodUrl)).toThrowError(
        /Unauthorized database host "db\.production-prod-ref\.supabase\.co"/
      );
      // Ensure password is not leaked in error message
      try {
        validateStagingDatabaseUrl(prodUrl);
      } catch (err: any) {
        expect(err.message).not.toContain('super_secret_production_password');
        expect(err.message).not.toContain('admin');
      }
    });

    it('TEST 5: Rejects localhost or loopback host', () => {
      const localUrl = 'postgresql://postgres:pw@127.0.0.1:5432/postgres';
      expect(() => validateStagingDatabaseUrl(localUrl)).toThrowError(
        /Unauthorized database host "127\.0\.0\.1"/
      );
    });

    it('TEST 6: Rejects alternate Supabase project references', () => {
      const otherSupabaseUrl = 'postgresql://postgres:pw@db.abcdefghijklmnopqrst.supabase.co:5432/postgres';
      expect(() => validateStagingDatabaseUrl(otherSupabaseUrl)).toThrowError(
        /Unauthorized database host "db\.abcdefghijklmnopqrst\.supabase\.co"/
      );
    });
  });

  // --------------------------------------------------------------------------
  // PART 3: MISSING & MALFORMED DATABASE_URL REJECTION
  // --------------------------------------------------------------------------
  describe('Part 3: Missing & Malformed URL Rejection', () => {
    it('TEST 7: Rejects undefined, null, or empty string', () => {
      expect(() => validateStagingDatabaseUrl(undefined)).toThrowError(
        /DATABASE_URL is missing or empty/
      );
      expect(() => validateStagingDatabaseUrl(null as any)).toThrowError(
        /DATABASE_URL is missing or empty/
      );
      expect(() => validateStagingDatabaseUrl('')).toThrowError(
        /DATABASE_URL is missing or empty/
      );
      expect(() => validateStagingDatabaseUrl('   ')).toThrowError(
        /DATABASE_URL is missing or empty/
      );
    });

    it('TEST 8: Rejects malformed strings that cannot be parsed as URLs', () => {
      expect(() => validateStagingDatabaseUrl('not_a_valid_url')).toThrowError(
        /DATABASE_URL is malformed or invalid/
      );
      expect(() => validateStagingDatabaseUrl('://missing-protocol')).toThrowError(
        /DATABASE_URL is malformed or invalid/
      );
    });

    it('TEST 9: Rejects non-postgres protocols (http, https, mysql, mongodb)', () => {
      expect(() => validateStagingDatabaseUrl('http://db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres')).toThrowError(
        /Unauthorized protocol "http:"/
      );
      expect(() => validateStagingDatabaseUrl('mysql://root:pw@db.ymrblyiwohvxptiqjfsi.supabase.co:3306/db')).toThrowError(
        /Unauthorized protocol "mysql:"/
      );
    });
  });

  // --------------------------------------------------------------------------
  // PART 4: HOSTNAME LOOKALIKE & SUBSTRING EVASION DEFENSE
  // --------------------------------------------------------------------------
  describe('Part 4: Hostname Lookalike & Substring Evasion Defense', () => {
    it('TEST 10: Rejects domain suffix attack (e.g. host.attacker.com)', () => {
      const suffixAttack = 'postgresql://postgres:pw@db.ymrblyiwohvxptiqjfsi.supabase.co.attacker.com:5432/postgres';
      expect(() => validateStagingDatabaseUrl(suffixAttack)).toThrowError(
        /Unauthorized database host "db\.ymrblyiwohvxptiqjfsi\.supabase\.co\.attacker\.com"/
      );
    });

    it('TEST 11: Rejects subdomain lookalike attack (e.g. evil-db...)', () => {
      const prefixAttack = 'postgresql://postgres:pw@evil-db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres';
      expect(() => validateStagingDatabaseUrl(prefixAttack)).toThrowError(
        /Unauthorized database host "evil-db\.ymrblyiwohvxptiqjfsi\.supabase\.co"/
      );
    });

    it('TEST 12: Rejects typosquatting attack (e.g. jfs1 instead of jfsi)', () => {
      const typoAttack = 'postgresql://postgres:pw@db.ymrblyiwohvxptiqjfs1.supabase.co:5432/postgres';
      expect(() => validateStagingDatabaseUrl(typoAttack)).toThrowError(
        /Unauthorized database host "db\.ymrblyiwohvxptiqjfs1\.supabase\.co"/
      );
    });

    it('TEST 13: Rejects project reference embedded in username or database path of a different host', () => {
      const userEvasion = 'postgresql://ymrblyiwohvxptiqjfsi:pw@db.evilhost.com:5432/ymrblyiwohvxptiqjfsi';
      expect(() => validateStagingDatabaseUrl(userEvasion)).toThrowError(
        /Unauthorized database host "db\.evilhost\.com"/
      );
    });
  });

  // --------------------------------------------------------------------------
  // PART 5: CONNECTION ATTEMPT INVARIANT & RUNNER ARCHITECTURE
  // --------------------------------------------------------------------------
  describe('Part 5: Guard Pre-Connection Invariant & Runner Integrity', () => {
    const runnerScriptPath = path.join(__dirname, '../../scripts/apply_staging_migrations.js');
    const runnerContent = fs.readFileSync(runnerScriptPath, 'utf-8');

    it('TEST 14: Guard execution precedes new pg.Pool and pool.connect in runner source code', () => {
      const guardCallIndex = runnerContent.indexOf('validateStagingDatabaseUrl(process.env.DATABASE_URL)');
      const poolCreationIndex = runnerContent.indexOf('new pg.Pool(');
      const poolConnectIndex = runnerContent.indexOf('await pool.connect()');

      expect(guardCallIndex).toBeGreaterThan(0);
      expect(poolCreationIndex).toBeGreaterThan(guardCallIndex);
      expect(poolConnectIndex).toBeGreaterThan(poolCreationIndex);
    });

    it('TEST 15: Exact migration filtering logic is intact in runner source', () => {
      expect(runnerContent).toContain('const targetFile = process.argv[2];');
      expect(runnerContent).toContain('migrations.filter(m => m === targetFile)');
      expect(runnerContent).toContain('Target migration "${targetFile}" is not registered in runner migration list.');
    });

    it('TEST 16: Advisory lock 746291048201582 and atomic transaction block are intact', () => {
      expect(MIGRATION_ADVISORY_LOCK_KEY).toBe('746291048201582');
      expect(runnerContent).toContain("await client.query('BEGIN');");
      expect(runnerContent).toContain('SELECT pg_advisory_xact_lock($1)');
      expect(runnerContent).toContain('INSERT INTO _migrations (name, run_at)');
      expect(runnerContent).toContain("await client.query('COMMIT');");
      expect(runnerContent).toContain("await client.query('ROLLBACK');");
    });

    it('TEST 17: phase_11_prelaunch_hardening.sql is registered at index 15 (migration 26) in migrations array', () => {
      expect(migrations).toContain('phase_11_prelaunch_hardening.sql');
      const phase11Index = migrations.indexOf('phase_11_prelaunch_hardening.sql');
      expect(phase11Index).toBe(15); // 16th item in array, corresponding to baseline 26
      expect(migrations.length).toBeGreaterThanOrEqual(16);
    });

    it('TEST 18: phase_13b_foreign_key_indexes.sql is registered at index 18 in migrations array', () => {
      expect(migrations).toContain('phase_13b_foreign_key_indexes.sql');
      const phase13bIndex = migrations.indexOf('phase_13b_foreign_key_indexes.sql');
      expect(phase13bIndex).toBe(18); // 19th item in array
      expect(migrations.length).toBe(19);
    });

    it('TEST 19: Migration filter rejects unregistered target migration files', () => {
      const unregistered = 'malicious_or_unknown_migration.sql';
      const filtered = migrations.filter(m => m === unregistered);
      expect(filtered.length).toBe(0);
    });
  });
});

