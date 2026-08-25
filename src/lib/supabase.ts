import { createClient } from '@supabase/supabase-js';

/**
 * Frontend Supabase client.
 *
 * Uses the ANON key, which is designed to be public — it is compiled into the
 * JavaScript bundle and anyone can read it. What protects your data is Row
 * Level Security (see supabase/migrations/0002_rls_core.sql), not the secrecy
 * of this key.
 *
 * The SERVICE ROLE key must NEVER appear in this file or anywhere under src/.
 * It bypasses every RLS policy. It belongs only in backend/.env.
 *
 * There are deliberately no hardcoded fallback values here. A previous version
 * defaulted to a live project URL and key, which meant a misconfigured deploy
 * silently connected to the wrong database instead of failing. Failing loudly
 * at startup is far cheaper to debug than data appearing in the wrong project.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration.\n' +
      'Create a .env file in the project root containing:\n' +
      '  VITE_SUPABASE_URL=https://<your-ref>.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=<your anon key>\n' +
      'See supabase/README.md for the full setup guide.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
