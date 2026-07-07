export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  finish_reason: 'stop' | 'tool_calls' | 'length';
}

export interface IAIProvider {
  /**
   * Generates a chat completion.
   * @param messages The conversation history and system prompts.
   * @param tools Definitions of tools the AI is allowed to call.
   */
  generateCompletion(messages: ChatMessage[], tools: any[]): Promise<ChatResponse>;
}
