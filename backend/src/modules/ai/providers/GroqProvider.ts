import { IAIProvider, ChatMessage, ChatResponse, ChatResponseUsage } from './IAIProvider';
import {
  AIProviderError,
  AIProviderConfigError,
  AIProviderRateLimitError,
  AIProviderNetworkError,
} from './AIProviderError';
import { logger } from '@logger/index';

/**
 * Groq AI Provider
 * Uses the Groq REST API directly via fetch (no SDK dependency).
 * Primary model: compound-beta (agentic)
 * Fallback model: llama-3.1-8b-instant
 */
export class GroqProvider implements IAIProvider {
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private readonly model = process.env.GROQ_PRIMARY_MODEL || 'compound-beta';

  constructor(private readonly apiKey: string) {}

  public async generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.error('[GroqProvider] GROQ_API_KEY is not configured');
      throw new AIProviderConfigError('GROQ_API_KEY is missing or unconfigured', 'groq');
    }

    const body: any = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    };

    // Only include tools if there are any registered
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      logger.error({ err }, '[GroqProvider] Network error calling Groq API');
      throw new AIProviderNetworkError(`Failed to reach Groq API: ${err.message || 'Network error'}`, 'groq');
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, '[GroqProvider] API error from Groq');

      if (response.status === 429) {
        throw new AIProviderRateLimitError('Groq API rate limit exceeded', 'groq');
      }

      if (response.status === 401 || response.status === 403) {
        throw new AIProviderConfigError(`Groq authentication failed (status ${response.status})`, 'groq');
      }

      throw new AIProviderError(
        `Groq API request failed with status ${response.status}: ${errorText}`,
        response.status >= 500 ? 502 : response.status,
        'groq',
        'API_ERROR'
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (err: any) {
      logger.error({ err }, '[GroqProvider] Failed to parse JSON response from Groq');
      throw new AIProviderError('Invalid JSON response received from Groq API', 502, 'groq', 'PARSE_ERROR');
    }

    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      logger.error({ data }, '[GroqProvider] No choices returned in Groq response');
      throw new AIProviderError('No completion choice returned from Groq API', 502, 'groq', 'EMPTY_RESPONSE');
    }

    let usage: ChatResponseUsage | null = null;
    if (data.usage) {
      usage = {
        prompt_tokens: typeof data.usage.prompt_tokens === 'number' ? data.usage.prompt_tokens : null,
        completion_tokens: typeof data.usage.completion_tokens === 'number' ? data.usage.completion_tokens : null,
        total_tokens: typeof data.usage.total_tokens === 'number' ? data.usage.total_tokens : null,
      };
    }

    return {
      message: choice.message,
      finish_reason: choice.finish_reason || 'stop',
      usage,
      model: data.model || this.model,
      provider: 'groq',
    };
  }
}
