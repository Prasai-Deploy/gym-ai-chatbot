/**
 * services/ai.service.ts
 * Shared AI utility for calling OpenRouter.
 */
import dotenv from "dotenv";
dotenv.config();
export async function callAI(userMessage, systemMessage, history = [], options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
        throw new Error("Missing Authentication: OPENROUTER_API_KEY is not defined in the environment.");
    }
    const messages = [
        { role: "system", content: systemMessage },
    ];
    for (const h of history) {
        const role = h.role === "model" || h.role === "assistant" ? "assistant" : "user";
        const content = h.parts && h.parts.length > 0 ? h.parts[0].text : h.content || "";
        if (content)
            messages.push({ role, content });
    }
    messages.push({ role: "user", content: userMessage });
    const models = [
        "liquid/lfm-2.5-1.2b-thinking:free",
        "google/gemma-3-27b-it:free"
    ];
    for (const model of models) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                    "X-Title": "Sweat Fix AI",
                },
                body: JSON.stringify({
                    model: model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    top_p: options.top_p ?? 1,
                }),
            });
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                const status = response.status;
                if ((status === 429 || status === 402) && model === models[0]) {
                    console.warn(`[AI] Model ${model} rate limited (${status}). Trying fallback...`);
                    continue;
                }
                const errorMessage = typeof errJson.error === "string"
                    ? errJson.error
                    : errJson.error?.message;
                throw new Error(errorMessage || `OpenRouter API Error (${status})`);
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content && model === models[0]) {
                console.warn(`[AI] Model ${model} returned empty. Trying fallback...`);
                continue;
            }
            return content || "";
        }
        catch (err) {
            if (model === models[0]) {
                console.error(`[AI] Error with ${model}:`, err.message);
                continue;
            }
            throw err;
        }
    }
    return "";
}
