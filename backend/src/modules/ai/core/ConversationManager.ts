import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { ChatMessage } from '../providers/IAIProvider';

export interface ConversationRecord {
  id: string;
  user_id: string;
  organization_id?: string | null;
  scope?: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationOptions {
  organizationId?: string;
  scope?: 'consumer' | 'organization_advisor';
}

export class ConversationManager {
  constructor(private readonly supabase: SupabaseClient) {}

  public async createConversation(
    userId: string,
    title?: string,
    options?: ConversationOptions
  ): Promise<Result<ConversationRecord, AppError>> {
    try {
      const insertPayload: any = {
        user_id: userId,
        title: title || 'New Conversation',
        status: 'ACTIVE',
        scope: options?.scope || (options?.organizationId ? 'organization_advisor' : 'consumer'),
      };

      if (options?.organizationId) {
        insertPayload.organization_id = options.organizationId;
      }

      const { data, error } = await this.supabase
        .from('ai_conversations')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return ok(data as ConversationRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async appendMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    toolCalls?: any[],
    toolCallId?: string
  ): Promise<Result<any, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          tool_calls: toolCalls || null,
          tool_call_id: toolCallId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getHistory(
    conversationId: string,
    securityCheck?: { userId?: string; organizationId?: string }
  ): Promise<Result<ChatMessage[], AppError>> {
    try {
      // If security parameters are provided, verify ownership and tenant isolation
      if (securityCheck?.userId || securityCheck?.organizationId) {
        let convQuery = this.supabase
          .from('ai_conversations')
          .select('id, user_id, organization_id, scope')
          .eq('id', conversationId);

        if (securityCheck.userId) {
          convQuery = convQuery.eq('user_id', securityCheck.userId);
        }
        if (securityCheck.organizationId) {
          convQuery = convQuery.eq('organization_id', securityCheck.organizationId);
        }

        const fetchSingle = typeof (convQuery as any).maybeSingle === 'function'
          ? (convQuery as any).maybeSingle()
          : convQuery.single();

        const { data: convData, error: convErr } = await fetchSingle;
        if (convErr) throw convErr;
        if (!convData) {
          return fail(new NotFoundError('Conversation not found or access denied'));
        }
      }

      const { data, error } = await this.supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const messages: ChatMessage[] = (data || []).map((row: any) => ({
        role: row.role as any,
        content: row.content || '',
        tool_calls: row.tool_calls || undefined,
        tool_call_id: row.tool_call_id || undefined,
      }));
      return ok(messages);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async listConversations(
    userId: string,
    options?: ConversationOptions
  ): Promise<Result<ConversationRecord[], AppError>> {
    try {
      let query = this.supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId);

      if (options?.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }
      if (options?.scope) {
        query = query.eq('scope', options.scope);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      let records = (data || []) as ConversationRecord[];
      // If no options specified, default to consumer scope by filtering out organization_advisor
      if (!options?.organizationId && !options?.scope) {
        records = records.filter((r) => r.scope !== 'organization_advisor');
      }

      return ok(records);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async renameConversation(
    conversationId: string,
    title: string,
    userId: string,
    organizationId?: string
  ): Promise<Result<ConversationRecord, AppError>> {
    try {
      let query = this.supabase
        .from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      if (!data) return fail(new NotFoundError('Conversation not found or access denied'));
      return ok(data as ConversationRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async deleteConversation(
    conversationId: string,
    userId: string,
    organizationId?: string
  ): Promise<Result<void, AppError>> {
    try {
      let query = this.supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { error } = await query;

      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}

