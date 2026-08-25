export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatResponseUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export interface ChatResponse {
  message: ChatMessage;
  finish_reason: 'stop' | 'tool_calls' | 'length';
  usage?: ChatResponseUsage | null;
  model?: string | null;
  provider?: string;
}

export interface IAIProvider {
  /**
   * Generates a chat completion.
   * @param messages The conversation history and system prompts.
   * @param tools Definitions of tools the AI is allowed to call.
   */
  generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse>;
}
