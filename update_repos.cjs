const fs = require('fs');
const replaceInFile = (file, src, dest) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(src).join(dest);
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
};
replaceInFile('backend/src/modules/identity/repositories/IdentityRepository.ts', "'fitness_profiles'", "'v2_fitness_profiles'");
replaceInFile('backend/src/modules/workout/repositories/WorkoutSessionRepository.ts', "'workout_sessions'", "'v2_workout_sessions'");
replaceInFile('backend/src/modules/intelligence/repositories/NutritionRepository.ts', "'nutrition_logs'", "'v2_nutrition_logs'");
