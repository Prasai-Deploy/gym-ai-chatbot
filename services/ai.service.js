/**
 * services/ai.service.ts
 * Multi-model AI routing system using OpenRouter free models.
 */
import dotenv from "dotenv";
dotenv.config();
export const MODELS = {
    MAIN: process.env.MODEL_MAIN || "meta-llama/llama-3.1-8b-instruct:free",
    FAST: process.env.MODEL_FAST || "google/gemma-2-9b-it:free",
    PLANNER: process.env.MODEL_PLANNER || "deepseek/deepseek-r1:free",
    CODER: process.env.MODEL_CODER || "qwen/qwen-2.5-coder-32b-instruct:free",
};
/**
 * Heuristic intent routing to select the best model.
 */
export function determineModel(message) {
    const msg = message.toLowerCase();
    // Backend/code/debug tasks
    if (/(code|debug|backend|error|bug|json|api|function|script|typescript|javascript)/i.test(msg)) {
        return MODELS.CODER;
    }
    // Workout or diet plan generation
    if (/(workout|diet) plan|meal plan|generate|create.*(plan|workout|meal)/i.test(msg)) {
        return MODELS.PLANNER;
    }
    // Simple chat/questions (short messages or quick greetings)
    if (msg.split(' ').length <= 6 || /^(hi|hello|hey|sup|how are you|thanks|bye|ok|good|awesome)/i.test(msg)) {
        return MODELS.FAST;
    }
    // Default: General fitness conversations
    return MODELS.MAIN;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
/**
 * Executes an OpenRouter API call with exponential backoff for rate limits
 * and graceful fallback to the FAST model if the primary model fails.
 */
async function executeWithRetryAndFallback(userMessage, systemMessage, history, model, retries = 2) {
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
    if (userMessage) {
        messages.push({ role: "user", content: userMessage });
    }
    let attempt = 0;
    while (attempt <= retries) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.error(`[AI DEBUG] Request to ${model} timed out after 15s`);
                controller.abort();
            }, 15000);
            const url = "https://openrouter.ai/api/v1/chat/completions";
            const payload = {
                model,
                messages,
                temperature: 0.7,
                top_p: 0.8,
            };
            console.log("=== [AI DEBUG] API Request ===");
            console.log(`URL: ${url}`);
            console.log(`Model: ${model}`);
            console.log(`API Key (masked): ${apiKey.substring(0, 10)}...`);
            console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
            console.log("Headers:", JSON.stringify({
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sweatfix.ai",
                "X-Title": "Sweat Fix Coach"
            }, null, 2));
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://sweatfix.ai",
                    "X-Title": "Sweat Fix Coach",
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            console.log("=== [AI DEBUG] API Response ===");
            console.log(`Status: ${response.status} ${response.statusText}`);
            const rawBody = await response.text();
            console.log(`Full Response Body: ${rawBody}`);
            if (!response.ok) {
                console.error(`[AI ERROR] HTTP ${response.status} from ${model}:`, rawBody);
                if (response.status === 429) {
                    console.warn(`[AI] Rate limit hit on ${model}, backing off...`);
                    await sleep(1000 * Math.pow(2, attempt));
                    attempt++;
                    continue;
                }
                let errorMessage = `OpenRouter API Error: HTTP ${response.status}`;
                try {
                    const errJson = JSON.parse(rawBody);
                    errorMessage = typeof errJson.error === "string" ? errJson.error : errJson.error?.message || errorMessage;
                }
                catch (parseErr) { }
                throw new Error(errorMessage);
            }
            const data = JSON.parse(rawBody);
            console.log(`[AI DEBUG] Successfully received response from ${model}`);
            return data.choices?.[0]?.message?.content || "";
        }
        catch (e) {
            console.error(`[AI EXCEPTION] Error calling model ${model} (attempt ${attempt + 1}):`);
            console.error(`Name: ${e.name}`);
            console.error(`Message: ${e.message}`);
            if (e.stack)
                console.error(`Stack: ${e.stack}`);
            attempt++;
            if (attempt > retries) {
                // Fallback logic - disabled for now as per Requirement 5
                console.warn(`[AI Router] Model ${model} failed permanently after ${attempt} attempts.`);
                throw e;
            }
        }
    }
    throw new Error("I'm currently experiencing high server traffic. Please try again in a few moments!");
}
/**
 * Main entry point for AI chat, including routing, retry, and fallback logic.
 */
export async function callAIWithRouting(userMessage, systemMessage, history = [], preferredModel) {
    const targetModel = preferredModel || determineModel(userMessage);
    console.log(`[AI Router] Routing request to: ${targetModel}`);
    try {
        return await executeWithRetryAndFallback(userMessage, systemMessage, history, targetModel);
    }
    catch (err) {
        console.warn(`[AI Router] Primary model ${targetModel} failed (${err.message}). Falling back to openrouter/free...`);
        // Fallback to the automated free router
        return await executeWithRetryAndFallback(userMessage, systemMessage, history, "openrouter/free", 1);
    }
}
/**
 * Legacy wrapper for basic callAI
 */
export async function callAI(userMessage, systemMessage, history = []) {
    return await callAIWithRouting(userMessage, systemMessage, history);
}
/**
 * Utility to parse markdown-wrapped JSON safely.
 */
export function parseJSONResponse(rawResponse) {
    try {
        const cleaned = rawResponse
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/, "")
            .trim();
        // Sometimes the model leaves leading or trailing text before the JSON object
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
            return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
        }
        return JSON.parse(cleaned);
    }
    catch (e) {
        throw new Error(`Failed to parse AI JSON response: ${e.message}`);
    }
}
