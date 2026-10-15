import { httpClient } from './httpClient';

export interface AdvisorMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolsCalled?: string[];
  createdAt?: string;
}

export interface AdvisorConversation {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatResponseData {
  conversationId: string;
  agentId: string;
  message: string;
  toolsCalled?: string[];
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  model?: string;
  provider?: string;
}

export const advisorApi = {
  async sendMessage(params: {
    message: string;
    conversationId?: string;
  }): Promise<ChatResponseData> {
    const res = await httpClient.post<{ success: boolean; data: ChatResponseData }>(
      '/api/v1/organizations/current/advisor/chat',
      params
    );
    return res.data.data;
  },

  async listConversations(): Promise<AdvisorConversation[]> {
    const res = await httpClient.get<{ success: boolean; data: AdvisorConversation[] }>(
      '/api/v1/organizations/current/advisor/conversations'
    );
    return res.data.data;
  },

  async getConversationHistory(conversationId: string): Promise<AdvisorMessage[]> {
    const res = await httpClient.get<{ success: boolean; data: any[] }>(
      `/api/v1/organizations/current/advisor/conversations/${conversationId}/messages`
    );
    return (res.data.data || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      toolsCalled: m.tool_calls
        ? m.tool_calls.map((t: any) => t.function?.name || t.name || 'tool')
        : undefined,
      createdAt: m.created_at,
    }));
  },

  async renameConversation(conversationId: string, title: string): Promise<AdvisorConversation> {
    const res = await httpClient.patch<{ success: boolean; data: AdvisorConversation }>(
      `/api/v1/organizations/current/advisor/conversations/${conversationId}`,
      { title }
    );
    return res.data.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await httpClient.delete(
      `/api/v1/organizations/current/advisor/conversations/${conversationId}`
    );
  },
};
