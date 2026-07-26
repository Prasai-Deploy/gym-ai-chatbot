import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { ChatMessage } from '../providers/IAIProvider';

export class ConversationManager {
  constructor(private readonly supabase: SupabaseClient) {}

  public async getOrCreateConversation(userId: string, conversationId?: string): Promise<Result<string, AppError>> {
    try {
      if (conversationId) {
        // Validate existence
        const { data, error } = await this.supabase
          .from('ai_conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('user_id', userId)
          .single();
        if (error) throw error;
        return ok(data.id);
      }

      // Create new
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title: 'New Conversation' })
        .select()
        .single();
      if (error) throw error;
      return ok(data.id);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async appendMessage(conversationId: string, message: ChatMessage): Promise<Result<void, AppError>> {
    try {
      const payload = {
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        tool_calls: message.tool_calls || null,
        tool_call_id: message.tool_call_id || null
      };

      const { error } = await this.supabase.from('ai_messages').insert(payload);
      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getHistory(conversationId: string): Promise<Result<ChatMessage[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const messages: ChatMessage[] = data.map((row: any) => ({
        role: row.role,
        content: row.content || '',
        tool_calls: row.tool_calls,
        tool_call_id: row.tool_call_id
      }));
      
      return ok(messages);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
