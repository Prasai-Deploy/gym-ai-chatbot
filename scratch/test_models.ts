import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

const models = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-2-27b-it:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen-2.5-coder-32b:free"
];

async function run() {
  for (const model of models) {
    console.log(`\nTesting ${model}...`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey?.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "hi" }],
        })
      });

      console.log(`Status: ${response.status}`);
      if (!response.ok) {
        console.log(`Error:`, await response.text());
      } else {
        console.log(`Success!`);
      }
    } catch (e: any) {
      console.error("Exception:", e.message);
    }
  }
}

run();
