/**
 * services/ai.service.ts
 * Multi-model AI routing system using OpenRouter free models.
 */
import dotenv from "dotenv";

dotenv.config();

export const MODELS = {
  MAIN: process.env.MODEL_MAIN || "meta-llama/llama-3.3-70b-instruct:free",
  FAST: process.env.MODEL_FAST || "google/gemma-3-27b-it:free",
  PLANNER: process.env.MODEL_PLANNER || "deepseek/deepseek-r1:free",
  CODER: process.env.MODEL_CODER || "qwen/qwen3-coder:free",
};

/**
 * Heuristic intent routing to select the best model.
 */
export function determineModel(message: string): string {
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Executes an OpenRouter API call with exponential backoff for rate limits
 * and graceful fallback to the FAST model if the primary model fails.
 */
async function executeWithRetryAndFallback(
  userMessage: string,
  systemMessage: string,
  history: any[],
  model: string,
  retries: number = 2
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Missing Authentication: OPENROUTER_API_KEY is not defined in the environment.");
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemMessage },
  ];

  for (const h of history) {
    const role = h.role === "model" || h.role === "assistant" ? "assistant" : "user";
    const content = h.parts && h.parts.length > 0 ? h.parts[0].text : h.content || "";
    if (content) messages.push({ role, content });
  }

  if (userMessage) {
    messages.push({ role: "user", content: userMessage });
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sweatfix.ai",
          "X-Title": "Sweat Fix Coach",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          top_p: 0.8,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[AI ERROR] HTTP ${response.status} from ${model}:`, errText);

        if (response.status === 429) {
          console.warn(`[AI] Rate limit hit on ${model}, backing off...`);
          await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
          attempt++;
          continue;
        }

        let errorMessage = `OpenRouter API Error: HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(errText);
          errorMessage = typeof errJson.error === "string" ? errJson.error : errJson.error?.message || errorMessage;
        } catch (parseErr) {}
        
        throw new Error(errorMessage);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
      console.error(`[AI EXCEPTION] Error calling model ${model} (attempt ${attempt + 1}):`, e.message || e);
      attempt++;
      if (attempt > retries) {
        // Fallback logic
        if (model !== MODELS.FAST) {
          console.warn(`[AI Router] Model ${model} failed permanently. Falling back to ${MODELS.FAST}`);
          return executeWithRetryAndFallback(userMessage, systemMessage, history, MODELS.FAST, 0); // No retries on fallback
        }
        throw e;
      }
    }
  }

  throw new Error("I'm currently experiencing high server traffic. Please try again in a few moments!");
}

/**
 * Main entry point for AI chat, including routing, retry, and fallback logic.
 */
export async function callAIWithRouting(
  userMessage: string,
  systemMessage: string,
  history: any[] = [],
  preferredModel?: string
): Promise<string> {
  const targetModel = preferredModel || determineModel(userMessage);
  console.log(`[AI Router] Routing request to: ${targetModel}`);
  return await executeWithRetryAndFallback(userMessage, systemMessage, history, targetModel);
}

/**
 * Legacy wrapper for basic callAI
 */
export async function callAI(
  userMessage: string,
  systemMessage: string,
  history: any[] = []
): Promise<string> {
  return await callAIWithRouting(userMessage, systemMessage, history);
}

/**
 * Utility to parse markdown-wrapped JSON safely.
 */
export function parseJSONResponse(rawResponse: string): any {
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
  } catch (e: any) {
    throw new Error(`Failed to parse AI JSON response: ${e.message}`);
  }
}
