import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('8080'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional().default(process.env.RAZORPAY_KEY_ID || ''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(process.env.RAZORPAY_KEY_SECRET || ''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(process.env.RAZORPAY_WEBHOOK_SECRET || ''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
