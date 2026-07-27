import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ymrblyiwohvxptiqjfsi.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcmJseWl3b2h2eHB0aXFqZnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDU2NDEsImV4cCI6MjA5Njk4MTY0MX0.iYJRWMsQlp0MuEG0Eb7bZcVy73CJifRwoNp_brUxKYY';

// Frontend Supabase client — used only for initiating OAuth flow
export const supabase = createClient(supabaseUrl, supabaseKey);
