import { httpClient } from './httpClient';
import { supabase } from '../lib/supabase';

export interface ChatPayload {
  message: string;
  conversationId?: string;
  stream?: boolean;
}

export const coachApi = {
  chat: async (payload: ChatPayload) => {
    return httpClient.post('/ai/chat', payload);
  },

  streamChat: async (
    payload: ChatPayload,
    onEvent: (eventType: string, data: any) => void
  ): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const response = await fetch('/api/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    if (!response.ok) {
      let errData: any = null;
      try {
        errData = await response.json();
      } catch {
        // Response was not JSON
      }
      const err = new Error(errData?.error?.message || errData?.message || `SSE stream failed with status ${response.status}`) as any;
      err.status = response.status;
      err.code = errData?.error?.code || errData?.code;
      err.data = errData;
      throw err;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not supported');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Normalize CRLF to LF for consistent block splitting
      const normalized = buffer.replace(/\r\n/g, '\n');
      const blocks = normalized.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const val = line.slice(5).trim();
            dataStr = dataStr ? `${dataStr}\n${val}` : val;
          }
        }

        if (dataStr) {
          try {
            const parsedData = JSON.parse(dataStr);
            onEvent(eventType, parsedData);
          } catch {
            onEvent(eventType, dataStr);
          }
        }
      }
    }
  },

  listConversations: async () => {
    return httpClient.get('/ai/conversations');
  },

  history: async (conversationId: string) => {
    return httpClient.get(`/ai/conversations/${conversationId}/messages`);
  },

  renameConversation: async (conversationId: string, title: string) => {
    return httpClient.patch(`/ai/conversations/${conversationId}`, { title });
  },

  deleteConversation: async (conversationId: string) => {
    return httpClient.delete(`/ai/conversations/${conversationId}`);
  },
};
