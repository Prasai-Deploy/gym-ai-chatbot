import pool from "../db.js";
import { updateWeeklyProgress } from "../services/progress.service.js";

async function seedData() {
  const userId = 1; // Assuming demo user or first user
  const today = new Date();
  
  console.log("Seeding weekly progress data...");
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    await updateWeeklyProgress(userId, dateStr, {
      workouts_completed: i % 2 === 0 ? 1 : 0,
      exercises_completed: i % 2 === 0 ? 6 : 0,
      calories_burned: i % 2 === 0 ? 400 + (i * 20) : 0,
      workout_duration: i % 2 === 0 ? 45 + (i * 5) : 0,
      hydration_completion: 70 + (i * 4),
      diet_completion: 80 + (i * 2),
      streak_value: 7 - i
    });
  }
  
  console.log("Seeding complete.");
  process.exit(0);
}

seedData().catch(e => {
  console.error(e);
  process.exit(1);
});
