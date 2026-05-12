/**
 * services/ai.service.ts
 * Multi-model AI routing system using Groq API.
 */
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export const MODELS = {
  MAIN: process.env.GROQ_PRIMARY_MODEL || "compound-beta",
  FAST: process.env.GROQ_FAST_MODEL || "compound-beta-mini",
  PLANNER: process.env.GROQ_PRIMARY_MODEL || "compound-beta",
  CODER: process.env.GROQ_PRIMARY_MODEL || "compound-beta",
  FALLBACK: process.env.GROQ_FALLBACK_MODEL || "llama-3.1-8b-instant",
  MODERATION: process.env.GROQ_MODERATION_MODEL || "meta-llama/llama-prompt-guard-2-22m",
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
 * Executes a Groq API call with exponential backoff for rate limits
 * and graceful fallback to the fallback model if the primary model fails.
 */
async function executeWithRetryAndFallback(
  userMessage: string,
  systemMessage: string,
  history: any[],
  model: string,
  retries: number = 2
): Promise<string> {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === "") {
    throw new Error("Missing Authentication: GROQ_API_KEY is not defined in the environment.");
  }

  const messages: any[] = [
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
      console.log("=== [AI DEBUG] API Request ===");
      console.log(`Model: ${model}`);
      console.log(`Payload messages count: ${messages.length}`);
      
      const response = await groq.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        top_p: 0.8,
        max_tokens: 4096,
      }, {
        timeout: 30000, // 30 second timeout for Groq API
      });

      console.log("=== [AI DEBUG] API Response ===");
      console.log(`Successfully received response from ${model}`);
      
      return response.choices[0]?.message?.content || "";
    } catch (e: any) {
      console.error(`[AI EXCEPTION] Error calling model ${model} (attempt ${attempt + 1}):`);
      console.error(`Name: ${e.name}`);
      console.error(`Message: ${e.message}`);
      
      if (e.status === 429) {
        console.warn(`[AI] Rate limit hit on ${model}, backing off...`);
        await sleep(1000 * Math.pow(2, attempt)); 
        attempt++;
        continue;
      }

      attempt++;
      if (attempt > retries) {
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
export async function callAIWithRouting(
  userMessage: string,
  systemMessage: string,
  history: any[] = [],
  preferredModel?: string
): Promise<string> {
  const targetModel = preferredModel || determineModel(userMessage);
  console.log(`[AI Router] Routing request to: ${targetModel}`);
  
  try {
    return await executeWithRetryAndFallback(userMessage, systemMessage, history, targetModel);
  } catch (err: any) {
    console.warn(`[AI Router] Primary model ${targetModel} failed (${err.message}). Falling back to ${MODELS.FALLBACK}...`);
    // Fallback to the reliable/fast model
    return await executeWithRetryAndFallback(userMessage, systemMessage, history, MODELS.FALLBACK, 1);
  }
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
