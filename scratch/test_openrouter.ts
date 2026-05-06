import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
console.log("Key prefix:", apiKey?.substring(0, 10));

async function run() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey?.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sweatfix.ai",
        "X-Title": "Sweat Fix Coach",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Body:", text);
  } catch (e: any) {
    console.error("Exception:", e);
  }
}

run();
