import { IAIProvider, ChatMessage, ChatResponse } from './IAIProvider';
import { logger } from '@logger/index';

/**
 * Groq AI Provider
 * Uses the Groq REST API directly via fetch (no SDK dependency).
 * Primary model: compound-beta (agentic)
 * Fallback: llama-3.1-8b-instant
 */
export class GroqProvider implements IAIProvider {
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private readonly model = process.env.GROQ_PRIMARY_MODEL || 'compound-beta';
  private readonly fallbackModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

  constructor(private readonly apiKey: string) {}

  public async generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse> {
    if (!this.apiKey) {
      logger.warn('[GroqProvider] No API key configured — returning stub response');
      return this.stubResponse(messages);
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

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, '[GroqProvider] API error');
        // Fallback to stub on API error so the user still gets a response
        return this.stubResponse(messages);
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        logger.error({ data }, '[GroqProvider] No choices in response');
        return this.stubResponse(messages);
      }

      return {
        message: choice.message,
        finish_reason: choice.finish_reason,
      };
    } catch (err: any) {
      logger.error({ err }, '[GroqProvider] Network error calling Groq API');
      return this.stubResponse(messages);
    }
  }

  private stubResponse(messages: ChatMessage[]): ChatResponse {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();

    // Simulate a tool call request for testing the orchestration loop
    if (lastUserMessage?.content?.toLowerCase().includes('start my workout')) {
      return {
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'logWorkout',
                arguments: JSON.stringify({ sessionId: 'dummy-uuid', state: 'started', notes: 'Lets go!' }),
              },
            },
          ],
        },
        finish_reason: 'tool_calls',
      };
    }

    return {
      message: {
        role: 'assistant',
        content:
          'I am your STRIVA AI Coach. I can help with your workouts, nutrition, and fitness goals. How can I assist you today?',
      },
      finish_reason: 'stop',
    };
  }
}
