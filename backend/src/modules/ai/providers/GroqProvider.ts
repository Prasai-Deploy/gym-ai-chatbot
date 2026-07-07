import { IAIProvider, ChatMessage, ChatResponse } from './IAIProvider';
import { logger } from '@logger/index';

// Stub Groq Provider for vertical slice
export class GroqProvider implements IAIProvider {
  constructor(private readonly apiKey: string) {}

  public async generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse> {
    logger.info(`[GroqProvider] Simulating request with ${messages.length} messages and ${tools.length} tools`);
    
    // In a real implementation, we would use the official Groq SDK here.
    // For this slice, we return a mock successful response asking for a tool call, 
    // or a direct answer.
    
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    // Simulate a tool call request
    if (lastUserMessage && lastUserMessage.content.toLowerCase().includes('start my workout')) {
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
                arguments: JSON.stringify({ sessionId: 'dummy-uuid', state: 'started', notes: 'Lets go!' })
              }
            }
          ]
        },
        finish_reason: 'tool_calls'
      };
    }

    // Default chat completion
    return {
      message: {
        role: 'assistant',
        content: 'I am your STRIVA AI. How can I assist you with your fitness journey today?'
      },
      finish_reason: 'stop'
    };
  }
}
