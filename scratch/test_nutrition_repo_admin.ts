import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import { supabase, supabaseAdmin } from '../backend/src/database/supabase';
import { NutritionRepository } from '../backend/src/modules/nutrition/repositories/NutritionRepository';

async function testNutritionRepo() {
  const userId = 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b';
  const today = '2026-10-14';

  console.log('Testing NutritionRepository with anon `supabase` client:');
  const repoAnon = new NutritionRepository(supabase);
  const resAnon = await repoAnon.getDailySummary(userId, today);
  console.log('Anon result isSuccess:', resAnon.isSuccess());
  if (resAnon.isFailure()) {
    console.log('Anon error:', resAnon.error.message);
  }

  console.log('\nTesting NutritionRepository with `supabaseAdmin` client:');
  const repoAdmin = new NutritionRepository(supabaseAdmin);
  const resAdmin = await repoAdmin.getDailySummary(userId, today);
  console.log('Admin result isSuccess:', resAdmin.isSuccess());
  if (resAdmin.isSuccess()) {
    console.log('Admin summary data:', resAdmin.value);
  } else {
    console.log('Admin error:', resAdmin.error.message);
  }
}

testNutritionRepo().catch(console.error);
