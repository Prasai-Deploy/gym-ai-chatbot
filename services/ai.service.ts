/**
 * services/ai.service.ts
 * Shared AI utility for calling OpenRouter.
 */
import dotenv from "dotenv";
dotenv.config();

export async function callAI(
  userMessage: string,
  systemMessage: string,
  history: any[] = []
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Missing Authentication: OPENROUTER_API_KEY is not defined in the environment."
    );
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemMessage },
  ];

  for (const h of history) {
    const role =
      h.role === "model" || h.role === "assistant" ? "assistant" : "user";
    const content =
      h.parts && h.parts.length > 0 ? h.parts[0].text : h.content || "";
    if (content) messages.push({ role, content });
  }
  messages.push({ role: "user", content: userMessage });

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Sweat Fix Gym",
      },
      body: JSON.stringify({
        model: "tencent/hy3-preview:free",
        messages,
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errorMessage =
      typeof (errJson as any).error === "string"
        ? (errJson as any).error
        : (errJson as any).error?.message;
    throw new Error(errorMessage || "OpenRouter API Error");
  }

  const data = await response.json();
  return (data as any).choices?.[0]?.message?.content || "";
}
