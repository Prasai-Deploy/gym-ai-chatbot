import { NutritionAnalyticsEngine } from '../backend/src/modules/analytics/AnalyticsEngines';

console.log('=== DEMONSTRATING CHECK 6: NUTRITION CALORIES DEFECT ===');

// 1. Exact shape of row returned by AnalyticsRepository.ts querying v2_nutrition_logs
const realV2NutritionRow = {
  id: '0d487db2-6729-4e78-9005-7264a4dcf9c4',
  user_id: 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b',
  date: '2026-10-14',
  meal_type: 'lunch',
  food_name: 'Grilled Chicken & Rice',
  calories: 2400, // <--- Canonical column name in v2_nutrition_logs
  protein_g: 150,
  carbs_g: 200,
  fats_g: 60,
  notes: 'Post-workout meal',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockRepo = {
  getOrgMemberIds: async () => ['a1bf8b11-e2c7-4f7f-9d36-5af53418e20b'],
  getNutritionLogsForUsers: async () => [realV2NutritionRow],
} as any;

const engine = new NutritionAnalyticsEngine(mockRepo);
const period = { from: '2026-10-01', to: '2026-10-31' };

async function run() {
  const result = await engine.compute('org-uuid', period);

console.log('Input log calories:', realV2NutritionRow.calories);
console.log('Input log calories_consumed:', (realV2NutritionRow as any).calories_consumed);
console.log('Result computed by AnalyticsEngines.ts:');
console.log({
  avgCaloriesLogged: result.avgCaloriesLogged,
  avgProteinAdherencePct: result.avgProteinAdherencePct,
  avgMacroScore: result.avgMacroScore,
  membersLoggingDaily: result.membersLoggingDaily,
  loggingAdherencePct: result.loggingAdherencePct
});

  if (result.avgCaloriesLogged === 0 && realV2NutritionRow.calories > 0) {
    console.log('\n[ROOT CAUSE DEMONSTRATED CONCLUSIVELY]');
    console.log('AnalyticsEngines.ts line 550 reads `log.calories_consumed || 0`.');
    console.log('Because `v2_nutrition_logs` schema column is `calories`, `log.calories_consumed` is undefined.');
    console.log('Result: Analytics undercounts calories to ZERO!');
  } else {
    console.log('\nDefect not observed.');
  }
}
run();
