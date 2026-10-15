import { z } from 'zod';
import dotenv from 'dotenv';

import path from 'path';

// Load environment variables from .env file (workspace root and backend local)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

/**
 * Custom Zod refinement to validate PostgreSQL database connection URLs safely.
 * Never echoes credentials or raw connection strings in error messages.
 */
export const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, 'DATABASE_URL cannot be empty')
  .superRefine((val, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL must be a valid URL with a postgresql:// or postgres:// protocol',
      });
      return;
    }

    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `DATABASE_URL must use postgresql:// or postgres:// protocol (received "${parsed.protocol}")`,
      });
      return;
    }

    if (!parsed.hostname || parsed.hostname.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL must include a valid database hostname',
      });
      return;
    }
  });

/**
 * Validates a given database connection URL string.
 * Throws a clean fail-fast error without revealing credentials if invalid.
 */
export function validateDatabaseUrl(url?: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('DATABASE_URL is required for direct database operations but was not provided.');
  }
  const result = databaseUrlSchema.safeParse(url.trim());
  if (!result.success) {
    const errorMsg = result.error.errors[0]?.message || 'Invalid DATABASE_URL configuration';
    throw new Error(`Invalid database connection URL: ${errorMsg}`);
  }
  return result.data;
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('8080'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(databaseUrlSchema.optional()),
  GROQ_API_KEY: z.string().optional(),
  GROQ_PRIMARY_MODEL: z.string().optional().default(process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b'),
  GROQ_FALLBACK_MODEL: z.string().optional().default(process.env.GROQ_FALLBACK_MODEL || ''),
  RAZORPAY_KEY_ID: z.string().optional().default(process.env.RAZORPAY_KEY_ID || ''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(process.env.RAZORPAY_KEY_SECRET || ''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(process.env.RAZORPAY_WEBHOOK_SECRET || ''),
});

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;

/**
 * Asserts that DATABASE_URL is configured and valid in the environment.
 * Used by direct database runners/scripts without exposing secrets.
 */
export function requireDatabaseUrl(targetEnv: { DATABASE_URL?: string } = env): string {
  return validateDatabaseUrl(targetEnv.DATABASE_URL);
}

