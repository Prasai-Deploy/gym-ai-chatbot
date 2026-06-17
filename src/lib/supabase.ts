import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Frontend Supabase client — used only for initiating OAuth flow
export const supabase = createClient(supabaseUrl, supabaseKey);
