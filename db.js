// db.js — Supabase client (server-side)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[DB] SUPABASE_URL or SUPABASE_KEY not set. Database features will be disabled.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "", {
  auth: { persistSession: false },
});

console.log("[DB] Supabase client initialised for:", supabaseUrl);

export default supabase;
