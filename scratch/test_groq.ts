import { callAIWithRouting } from "../services/ai.service.js";

async function run() {
  console.log("Testing Groq AI routing...");
  try {
    const res = await callAIWithRouting("Generate a detailed workout plan for me", "You are a helpful assistant.", [], "compound-beta");
    console.log("Response:", res);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
