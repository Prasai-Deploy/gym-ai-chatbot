import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { UsageAnalytics } from '../agents/agent.types';
import { supabaseAdmin } from '@database/supabase';
import { logger } from '@logger/index';

export class AIUsageRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient = supabaseAdmin) {
    super(supabase, 'ai_usage_analytics');
  }

  /**
   * Persists an AI invocation's token usage, latency, and tool metadata to PostgreSQL.
   */
  public async recordUsage(analytics: UsageAnalytics): Promise<Result<UsageAnalytics, AppError>> {
    try {
      if (!analytics.userId) {
        return fail(new ValidationError('userId is required to record AI usage'));
      }
      if (!analytics.organizationId) {
        return fail(new ValidationError('organizationId is required to record AI usage'));
      }

      const payload = {
        user_id: analytics.userId,
        organization_id: analytics.organizationId,
        agent_id: analytics.agentId,
        session_id: analytics.sessionId || null,
        provider: analytics.provider,
        model: analytics.model,
        request_timestamp: analytics.requestTimestamp || new Date().toISOString(),
        duration_ms: analytics.durationMs,
        prompt_tokens: analytics.promptTokens,
        completion_tokens: analytics.completionTokens,
        total_tokens: analytics.totalTokens,
        tool_calls_count: analytics.toolCallsCount,
        tools_called: analytics.toolsCalled || [],
        success: analytics.success,
        error_category: analytics.errorCategory || null,
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(payload)
        .select()
        .single();

      if (error) {
        logger.error({ err: error.message, analytics }, '[AIUsageRepository] Failed to insert usage record');
        return fail(new AppError(`Failed to persist AI usage record: ${error.message}`, 500));
      }

      const savedRecord: UsageAnalytics = {
        id: data.id,
        agentId: data.agent_id,
        organizationId: data.organization_id,
        userId: data.user_id,
        sessionId: data.session_id,
        provider: data.provider,
        model: data.model,
        requestTimestamp: data.request_timestamp,
        durationMs: data.duration_ms,
        promptTokens: data.prompt_tokens,
        completionTokens: data.completion_tokens,
        totalTokens: data.total_tokens,
        toolCallsCount: data.tool_calls_count,
        toolsCalled: data.tools_called,
        success: data.success,
        errorCategory: data.error_category,
        createdAt: data.created_at,
        tokensUsed: data.total_tokens ?? 0,
      };

      return ok(savedRecord);
    } catch (err: any) {
      logger.error({ err: err.message }, '[AIUsageRepository] Unexpected error in recordUsage');
      return fail(new AppError(err.message || 'Failed to record AI usage', 500));
    }
  }

  /**
   * Retrieves usage analytics records for an organization.
   */
  public async getUsageByOrganization(
    organizationId: string,
    limit: number = 50
  ): Promise<Result<UsageAnalytics[], AppError>> {
    try {
      if (!organizationId) {
        return fail(new ValidationError('organizationId is required'));
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return fail(new AppError(`Failed to fetch AI usage: ${error.message}`, 500));
      }

      const records: UsageAnalytics[] = (data || []).map((row: any) => ({
        id: row.id,
        agentId: row.agent_id,
        organizationId: row.organization_id,
        userId: row.user_id,
        sessionId: row.session_id,
        provider: row.provider,
        model: row.model,
        requestTimestamp: row.request_timestamp,
        durationMs: row.duration_ms,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        totalTokens: row.total_tokens,
        toolCallsCount: row.tool_calls_count,
        toolsCalled: row.tools_called || [],
        success: row.success,
        errorCategory: row.error_category,
        createdAt: row.created_at,
        tokensUsed: row.total_tokens ?? 0,
      }));

      return ok(records);
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to query AI usage', 500));
    }
  }
}

export const aiUsageRepository = new AIUsageRepository();
