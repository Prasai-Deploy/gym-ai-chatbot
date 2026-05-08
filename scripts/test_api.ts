import dotenv from "dotenv";

dotenv.config();

const TEST_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free"
];

async function testAPI() {
  console.log("=== OpenRouter Multi-Model Test ===");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY missing!");
    return;
  }

  for (const model of TEST_MODELS) {
    console.log(`\n--- Testing Model: ${model} ---`);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sweatfix.ai",
          "X-Title": "Sweat Fix Test"
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Say 'OK'" }]
        })
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      const body = await response.text();
      console.log(`Body: ${body.substring(0, 200)}...`);

      if (response.ok) {
        console.log(`✅ ${model} is WORKING!`);
      } else {
        console.log(`❌ ${model} FAILED.`);
      }
    } catch (e: any) {
      console.error(`❌ Error testing ${model}: ${e.message}`);
    }
  }
}

testAPI();
