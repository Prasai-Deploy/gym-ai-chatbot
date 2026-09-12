import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Support both `npm run dev:backend` (cwd=backend) and root-level `npm start`.
// Existing host-provided variables always win because dotenv does not override them.
const backendEnvPath = path.resolve(
  process.cwd(),
  path.basename(process.cwd()).toLowerCase() === 'backend' ? '.env' : 'backend/.env',
);
dotenv.config({ path: backendEnvPath });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('8080'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z
    .string()
    .optional()
    .default(process.env.RAZORPAY_KEY_ID || ''),
  RAZORPAY_KEY_SECRET: z
    .string()
    .optional()
    .default(process.env.RAZORPAY_KEY_SECRET || ''),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default(process.env.RAZORPAY_WEBHOOK_SECRET || ''),
  INTEGRATION_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default(process.env.INTEGRATION_WEBHOOK_SECRET || ''),
});

const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const environment = isTestEnvironment
  ? {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ...process.env,
      NODE_ENV: 'test',
    }
  : process.env;

const parsedEnv = envSchema.safeParse(environment);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsedEnv.error.format())}`);
}

export const env = parsedEnv.data;
