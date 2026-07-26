import { httpClient } from './httpClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    conversationId: string;
    status?: 'tools_executed';
  }
}

export const aiApi = {
  chat: async (message: string, conversationId?: string): Promise<ChatResponse> => {
    return httpClient.post('/ai/chat', { message, conversationId });
  }
};
