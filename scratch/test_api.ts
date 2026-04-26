import dotenv from "dotenv";
dotenv.config();

async function testAI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log("API Key found:", !!apiKey);
  if (apiKey) {
    console.log("API Key length:", apiKey.length);
    console.log("API Key prefix:", apiKey.substring(0, 10));
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey?.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
        messages: [{ role: "user", content: "hi" }]
      })
    });
    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data).substring(0, 200));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testAI();
