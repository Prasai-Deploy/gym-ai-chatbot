import { IAIProvider, ChatMessage, ChatResponse, ChatResponseUsage } from './IAIProvider';
import {
  AIProviderError,
  AIProviderConfigError,
  AIProviderRateLimitError,
  AIProviderNetworkError,
  AIProviderTimeoutError,
  AIModelNotFoundError,
  AIContextExceededError,
  AIServiceUnavailableError,
} from './AIProviderError';
import { logger } from '@logger/index';

/**
 * Groq AI Provider
 * Uses the Groq REST API directly via fetch with bounded request timeouts
 * and transient secondary-model fallback.
 */
export class GroqProvider implements IAIProvider {
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  public readonly model: string;
  public readonly fallbackModel?: string;
  public readonly timeoutMs: number;

  constructor(
    private readonly apiKey: string,
    modelOverride?: string,
    fallbackModelOverride?: string,
    timeoutMs: number = 15000
  ) {
    this.model = modelOverride || process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';
    const resolvedFallback = fallbackModelOverride !== undefined ? fallbackModelOverride : process.env.GROQ_FALLBACK_MODEL;
    this.fallbackModel = resolvedFallback && resolvedFallback.trim() !== '' ? resolvedFallback.trim() : undefined;
    this.timeoutMs = timeoutMs;
  }

  public async generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.error('[GroqProvider] GROQ_API_KEY is not configured');
      throw new AIProviderConfigError('GROQ_API_KEY is missing or unconfigured', 'groq');
    }

    try {
      return await this.executeCompletion(this.model, messages, tools);
    } catch (err: any) {
      if (this.isEligibleForFallback(err) && this.canFallback(this.model)) {
        logger.warn(
          {
            primaryModel: this.model,
            fallbackModel: this.fallbackModel,
            errCategory: err.category || err.name,
            errMsg: err.message,
          },
          '[GroqProvider] Primary model inference failed with eligible transient error; attempting secondary-model fallback'
        );

        try {
          return await this.executeCompletion(this.fallbackModel!, messages, tools);
        } catch (fallbackErr: any) {
          logger.error(
            {
              primaryModel: this.model,
              fallbackModel: this.fallbackModel,
              errCategory: fallbackErr.category || fallbackErr.name,
              errMsg: fallbackErr.message,
            },
            '[GroqProvider] Secondary fallback model inference also failed'
          );
          throw fallbackErr;
        }
      }

      // Non-retryable error or no fallback model configured -> fail immediately
      throw err;
    }
  }

  private async executeCompletion(
    model: string,
    messages: ChatMessage[],
    tools: any[]
  ): Promise<ChatResponse> {
    const body: any = {
      model,
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
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 23) {
        logger.error({ errName: err.name, model, timeoutMs: this.timeoutMs }, '[GroqProvider] Request timed out calling Groq API');
        throw new AIProviderTimeoutError(
          `Groq request timed out after ${this.timeoutMs}ms (model: ${model})`,
          'groq'
        );
      }
      logger.error({ errName: err.name, errMessage: err.message, model }, '[GroqProvider] Network error calling Groq API');
      throw new AIProviderNetworkError(
        `Failed to reach Groq API: ${err.message || 'Network error'} (model: ${model})`,
        'groq'
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText, model }, '[GroqProvider] API error from Groq');

      if (response.status === 429) {
        throw new AIProviderRateLimitError(`Groq API rate limit exceeded (model: ${model})`, 'groq');
      }

      if (response.status === 401 || response.status === 403) {
        throw new AIProviderConfigError(`Groq authentication failed (status ${response.status})`, 'groq');
      }

      if (response.status === 404) {
        throw new AIModelNotFoundError(`Groq model not found: ${model}`, 'groq');
      }

      if (response.status === 503) {
        throw new AIServiceUnavailableError(`Groq service temporarily unavailable (model: ${model})`, 'groq');
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
      logger.error({ err, model }, '[GroqProvider] Failed to parse JSON response from Groq');
      throw new AIProviderError('Invalid JSON response received from Groq API', 502, 'groq', 'PARSE_ERROR');
    }

    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      logger.error({ data, model }, '[GroqProvider] No choices returned in Groq response');
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
      model: data.model || model,
      provider: 'groq',
    };
  }

  private isEligibleForFallback(err: any): boolean {
    // 1. Permanent failures: Never fallback on configuration, authentication, context length, or client 4xx validation errors
    if (
      err instanceof AIProviderConfigError ||
      err instanceof AIContextExceededError
    ) {
      return false;
    }

    // 2. Explicit transient error classes: Rate limit (429), Timeout (504), Network (503), Model Not Found (404), Service Unavailable (503)
    if (
      err instanceof AIProviderRateLimitError ||
      err instanceof AIProviderTimeoutError ||
      err instanceof AIProviderNetworkError ||
      err instanceof AIServiceUnavailableError ||
      err instanceof AIModelNotFoundError
    ) {
      return true;
    }

    // 3. Status-code based evaluation on generic AIProviderError
    if (err instanceof AIProviderError) {
      // 401/403 are auth/config (permanent) -> do not retry
      if (err.statusCode === 401 || err.statusCode === 403) {
        return false;
      }
      // 400 is bad request/validation -> do not retry
      if (err.statusCode === 400) {
        return false;
      }
      // 404 (model missing), 429 (rate limit), 5xx (server error) are eligible
      if (err.statusCode === 404 || err.statusCode === 429 || err.statusCode >= 500) {
        return true;
      }
    }

    return false;
  }

  private canFallback(currentModel: string): boolean {
    return Boolean(
      this.fallbackModel &&
      this.fallbackModel.trim() !== '' &&
      this.fallbackModel.trim() !== currentModel.trim()
    );
  }
}
