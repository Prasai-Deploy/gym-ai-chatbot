// Using native fetch
import dotenv from 'dotenv';
dotenv.config();

const models = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "meta-llama/llama-3-8b-instruct:free",
  "openrouter/auto:free"
];

async function testModels() {
  for (const model of models) {
    console.log(`Testing ${model}...`);
    const start = Date.now();
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Say 'hello'" }]
        })
      });
      const data = await response.json();
      const end = Date.now();
      if (data.choices && data.choices.length > 0) {
        console.log(`✅ ${model} took ${end - start}ms: ${data.choices[0].message.content}`);
      } else {
        console.log(`❌ ${model} failed or rate limited.`);
        console.log(data);
      }
    } catch (e) {
      console.log(`❌ ${model} error: ${e.message}`);
    }
  }
}

testModels();
