import { callWorkoutAI, buildWorkoutPrompt } from "../services/workoutAI.service.js";

async function test() {
  const profile = {
    goal: "muscle",
    activity_level: "active",
    workout_days: 4,
    weight_kg: 70,
    age: 25
  };
  
  const prompt = buildWorkoutPrompt(profile, "Push Day", [], new Map());
  console.log("Calling AI with prompt...");
  try {
    const plan = await callWorkoutAI(prompt);
    console.log("Success! Parsed Plan:", JSON.stringify(plan, null, 2));
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
