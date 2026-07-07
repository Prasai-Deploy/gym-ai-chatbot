import { createClient } from '@supabase/supabase-js';
import { env } from '@config/env';

/**
 * The standard client using the ANON key.
 * Used for verifying auth tokens and passing through RLS from user requests.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * The admin client using the SERVICE ROLE key.
 * Bypasses Row Level Security (RLS).
 * MUST ONLY be used for backend background jobs, AI context generation, or admin tasks.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
