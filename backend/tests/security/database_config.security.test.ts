import { describe, it, expect } from 'vitest';
import {
  databaseUrlSchema,
  envSchema,
  validateDatabaseUrl,
  requireDatabaseUrl,
} from '../../src/config/env';

describe('STRIVA V2 — Phase 13B-3: Database Configuration Security & Runtime Validation', () => {
  const VALID_PG_URL = 'postgresql://postgres:secret_password_123@db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres';
  const VALID_PG_ALT_SCHEME = 'postgres://postgres:secret_password_123@db.ymrblyiwohvxptiqjfsi.supabase.co:5432/postgres';
  const VALID_LOCAL_PG = 'postgresql://postgres:local_secret@127.0.0.1:5433/striva_restore_test';
  const VALID_NO_AUTH_PG = 'postgresql://localhost:5432/postgres';

  const BASE_VALID_ENV = {
    NODE_ENV: 'test' as const,
    PORT: '8080',
    LOG_LEVEL: 'info' as const,
    SUPABASE_URL: 'https://ymrblyiwohvxptiqjfsi.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key-abc123xyz',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-def456uvw',
  };

  // --------------------------------------------------------------------------
  // PART 1: VALID DATABASE URL ACCEPTANCE
  // --------------------------------------------------------------------------
  describe('Part 1: Valid Database URL Acceptance', () => {
    it('TEST 1: Accepts canonical postgresql:// connection URL', () => {
      const result = databaseUrlSchema.safeParse(VALID_PG_URL);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(VALID_PG_URL);
      }
    });

    it('TEST 2: Accepts postgres:// scheme variant', () => {
      const result = databaseUrlSchema.safeParse(VALID_PG_ALT_SCHEME);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(VALID_PG_ALT_SCHEME);
      }
    });

    it('TEST 3: Accepts loopback IP host with custom port', () => {
      const result = databaseUrlSchema.safeParse(VALID_LOCAL_PG);
      expect(result.success).toBe(true);
    });

    it('TEST 4: Accepts valid PostgreSQL URL without credentials (peer/socket auth)', () => {
      const result = databaseUrlSchema.safeParse(VALID_NO_AUTH_PG);
      expect(result.success).toBe(true);
    });

    it('TEST 5: Accepts valid PostgreSQL URL with query parameters (e.g. sslmode, connection_limit)', () => {
      const urlWithParams = 'postgresql://app_user:pwd@db.host.internal:5432/appdb?sslmode=require&connection_limit=5';
      const result = databaseUrlSchema.safeParse(urlWithParams);
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // PART 2: MALFORMED URL AND INVALID PROTOCOL REJECTION
  // --------------------------------------------------------------------------
  describe('Part 2: Malformed URL and Invalid Protocol Rejection', () => {
    it('TEST 6: Rejects non-PostgreSQL protocols (http, https, mysql, mongodb)', () => {
      const invalidProtocols = [
        'http://admin:secret123@db.example.com:5432/db',
        'https://admin:secret123@db.example.com:5432/db',
        'mysql://root:secret123@127.0.0.1:3306/db',
        'mongodb://root:secret123@127.0.0.1:27017/db',
        'sqlite:///path/to/db.sqlite',
      ];

      for (const url of invalidProtocols) {
        const result = databaseUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toMatch(/must use postgresql:\/\/ or postgres:\/\/ protocol/);
        }
      }
    });

    it('TEST 7: Rejects malformed connection strings and random text', () => {
      const malformed = [
        'not-a-valid-url',
        '12345678',
        'postgres',
        '://invalid',
        'ftp://',
      ];

      for (const str of malformed) {
        const result = databaseUrlSchema.safeParse(str);
        expect(result.success).toBe(false);
      }
    });

    it('TEST 8: Rejects empty strings and whitespace-only values in schema', () => {
      expect(databaseUrlSchema.safeParse('').success).toBe(false);
      expect(databaseUrlSchema.safeParse('   ').success).toBe(false);
    });

    it('TEST 9: Rejects URLs missing a valid hostname', () => {
      const noHostUrls = ['postgresql://', 'postgres://', 'postgresql://user:pass@'];
      for (const url of noHostUrls) {
        const result = databaseUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // PART 3: RUNTIME CONFIGURATION MODES (OPTIONAL VS REQUIRED)
  // --------------------------------------------------------------------------
  describe('Part 3: Runtime Configuration Modes', () => {
    it('TEST 10: Allows missing DATABASE_URL for standard API runtime using Supabase HTTP client', () => {
      const envWithoutDbUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: undefined,
      };

      const result = envSchema.safeParse(envWithoutDbUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBeUndefined();
        expect(result.data.SUPABASE_URL).toBe('https://ymrblyiwohvxptiqjfsi.supabase.co');
      }
    });

    it('TEST 11: Treats empty string DATABASE_URL as undefined for standard runtime', () => {
      const envWithEmptyDbUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: '',
      };

      const result = envSchema.safeParse(envWithEmptyDbUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBeUndefined();
      }
    });

    it('TEST 12: Treats whitespace-only DATABASE_URL as undefined for standard runtime', () => {
      const envWithWhitespaceDbUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: '   ',
      };

      const result = envSchema.safeParse(envWithWhitespaceDbUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBeUndefined();
      }
    });

    it('TEST 13: Validates and accepts valid DATABASE_URL when supplied in environment', () => {
      const envWithValidDbUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: VALID_PG_URL,
      };

      const result = envSchema.safeParse(envWithValidDbUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(VALID_PG_URL);
      }
    });

    it('TEST 14: Fails environment parsing when DATABASE_URL is malformed in environment', () => {
      const envWithInvalidDbUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: 'http://invalid-scheme.com/db',
      };

      const result = envSchema.safeParse(envWithInvalidDbUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted.DATABASE_URL?._errors[0]).toMatch(
          /must use postgresql:\/\/ or postgres:\/\/ protocol/
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // PART 4: DIRECT DATABASE OPERATIONS FAIL-FAST ASSERTIONS
  // --------------------------------------------------------------------------
  describe('Part 4: Direct Database Operations Fail-Fast Assertions', () => {
    it('TEST 15: validateDatabaseUrl accepts valid URL and returns clean string', () => {
      const validated = validateDatabaseUrl(VALID_PG_URL);
      expect(validated).toBe(VALID_PG_URL);
    });

    it('TEST 16: validateDatabaseUrl throws clear error when URL is undefined or empty', () => {
      expect(() => validateDatabaseUrl(undefined)).toThrowError(
        /DATABASE_URL is required for direct database operations but was not provided/
      );
      expect(() => validateDatabaseUrl('')).toThrowError(
        /DATABASE_URL is required for direct database operations but was not provided/
      );
      expect(() => validateDatabaseUrl('   ')).toThrowError(
        /DATABASE_URL is required for direct database operations but was not provided/
      );
    });

    it('TEST 17: requireDatabaseUrl throws clear fail-fast error when environment lacks DATABASE_URL', () => {
      const mockEnvWithoutDb = { DATABASE_URL: undefined };
      expect(() => requireDatabaseUrl(mockEnvWithoutDb)).toThrowError(
        /DATABASE_URL is required for direct database operations but was not provided/
      );
    });

    it('TEST 18: requireDatabaseUrl returns URL when valid in environment', () => {
      const mockEnvWithDb = { DATABASE_URL: VALID_LOCAL_PG };
      const res = requireDatabaseUrl(mockEnvWithDb);
      expect(res).toBe(VALID_LOCAL_PG);
    });
  });

  // --------------------------------------------------------------------------
  // PART 5: CREDENTIAL AND SECRET LEAK PREVENTION
  // --------------------------------------------------------------------------
  describe('Part 5: Credential and Secret Leak Prevention', () => {
    const SENSITIVE_PASSWORD = 'ultra_secret_db_password_999!';
    const SENSITIVE_USER = 'super_admin_role_user';

    it('TEST 19: Error message from invalid protocol never contains user credentials or password', () => {
      const invalidUrlWithCreds = `http://${SENSITIVE_USER}:${SENSITIVE_PASSWORD}@db.internal:5432/prod`;
      const result = databaseUrlSchema.safeParse(invalidUrlWithCreds);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = JSON.stringify(result.error);
        expect(errorText).not.toContain(SENSITIVE_PASSWORD);
        expect(errorText).not.toContain(SENSITIVE_USER);
      }
    });

    it('TEST 20: Error message from malformed URL never contains sensitive credentials', () => {
      const malformedWithCreds = `postgres://${SENSITIVE_USER}:${SENSITIVE_PASSWORD}@`;
      const result = databaseUrlSchema.safeParse(malformedWithCreds);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = JSON.stringify(result.error);
        expect(errorText).not.toContain(SENSITIVE_PASSWORD);
        expect(errorText).not.toContain(SENSITIVE_USER);
      }
    });

    it('TEST 21: validateDatabaseUrl thrown exception message never leaks credentials', () => {
      const invalidUrlWithCreds = `http://${SENSITIVE_USER}:${SENSITIVE_PASSWORD}@db.internal:5432/prod`;

      try {
        validateDatabaseUrl(invalidUrlWithCreds);
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).not.toContain(SENSITIVE_PASSWORD);
        expect(err.message).not.toContain(SENSITIVE_USER);
      }
    });

    it('TEST 22: Formatted envSchema error never echoes raw secret strings', () => {
      const envWithBadUrl = {
        ...BASE_VALID_ENV,
        DATABASE_URL: `http://${SENSITIVE_USER}:${SENSITIVE_PASSWORD}@db.internal:5432/prod`,
      };

      const result = envSchema.safeParse(envWithBadUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = JSON.stringify(result.error.format());
        expect(formatted).not.toContain(SENSITIVE_PASSWORD);
        expect(formatted).not.toContain(SENSITIVE_USER);
      }
    });
  });
});
