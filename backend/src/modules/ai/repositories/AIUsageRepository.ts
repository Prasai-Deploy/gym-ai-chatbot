import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { UsageAnalytics, ConsumerAnalyticsSummary, ConsumerUsageItem } from '../agents/agent.types';
import { supabaseAdmin } from '@database/supabase';
import { logger } from '@logger/index';

export class AIUsageRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient = supabaseAdmin) {
    super(supabase, 'ai_usage_analytics');
  }

  /**
   * Persists an AI invocation's token usage, latency, and tool metadata to PostgreSQL.
   * Supports both B2B organization events (organizationId present) and consumer events (organizationId null).
   */
  public async recordUsage(analytics: UsageAnalytics): Promise<Result<UsageAnalytics, AppError>> {
    try {
      if (!analytics.userId) {
        return fail(new ValidationError('userId is required to record AI usage'));
      }

      // Canonical consumer vs B2B attribution:
      // If organizationId is provided and non-empty, attribute to organization.
      // If organizationId is missing, empty, or null, record as consumer event (organization_id = NULL).
      const resolvedOrgId =
        analytics.organizationId && analytics.organizationId.trim() !== ''
          ? analytics.organizationId.trim()
          : null;

      const payload = {
        user_id: analytics.userId,
        organization_id: resolvedOrgId,
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
        // Redacted structured logging: do not leak raw prompts, secrets, or sensitive payload data
        logger.error(
          {
            err: error.message,
            code: error.code,
            userId: analytics.userId,
            organizationId: resolvedOrgId,
            agentId: analytics.agentId,
            provider: analytics.provider,
            model: analytics.model,
          },
          '[AIUsageRepository] Failed to insert usage record'
        );
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
      logger.error(
        {
          err: err.message,
          userId: analytics.userId,
        },
        '[AIUsageRepository] Unexpected error in recordUsage'
      );
      return fail(new AppError(err.message || 'Failed to record AI usage', 500));
    }
  }

  /**
   * Retrieves usage analytics records for an organization (B2B).
   * Strictly filters by organization_id to preserve tenant isolation.
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

  /**
   * Retrieves consumer usage analytics records for an authenticated individual user.
   * Strictly isolates to records where user_id matches and organization_id IS NULL.
   */
  public async getUserUsage(
    userId: string,
    limit: number = 50
  ): Promise<Result<UsageAnalytics[], AppError>> {
    try {
      if (!userId) {
        return fail(new ValidationError('userId is required'));
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .is('organization_id', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error({ err: error.message, code: error.code, userId }, '[AIUsageRepository] Failed to fetch consumer AI usage');
        return fail(new AppError('Failed to fetch consumer AI usage records', 500));
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
      logger.error({ err: err.message, userId }, '[AIUsageRepository] Unexpected error in getUserUsage');
      return fail(new AppError('Failed to query consumer AI usage', 500));
    }
  }

  /**
   * Retrieves consumer usage analytics summary for an authenticated individual user.
   * Aggregates usage totals, request counts, token totals, and success/failure counts
   * strictly from records where user_id matches and organization_id IS NULL.
   * Never exposes prompts, raw responses, API keys, or other users' data.
   */
  public async getUserAnalyticsSummary(
    userId: string,
    limit: number = 50
  ): Promise<Result<ConsumerAnalyticsSummary, AppError>> {
    try {
      if (!userId || userId.trim() === '') {
        return fail(new ValidationError('userId is required'));
      }

      const recordsRes = await this.getUserUsage(userId.trim(), limit);
      if (recordsRes.isFailure()) {
        return fail(recordsRes.error);
      }

      const records = recordsRes.value;

      if (!records || records.length === 0) {
        return ok({
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalTokens: 0,
          averageDurationMs: 0,
          recentUsage: [],
        });
      }

      let successfulRequests = 0;
      let failedRequests = 0;
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalTokens = 0;
      let totalDurationMs = 0;

      for (const r of records) {
        if (r.success) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
        totalPromptTokens += r.promptTokens ?? 0;
        totalCompletionTokens += r.completionTokens ?? 0;
        totalTokens += r.totalTokens ?? 0;
        totalDurationMs += r.durationMs ?? 0;
      }

      const averageDurationMs = Math.round(totalDurationMs / records.length);

      const recentUsage: ConsumerUsageItem[] = records.map((r) => ({
        id: r.id || '',
        agentId: String(r.agentId),
        model: r.model,
        provider: r.provider,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        totalTokens: r.totalTokens,
        durationMs: r.durationMs,
        success: r.success,
        errorCategory: r.errorCategory || null,
        createdAt: r.createdAt || r.requestTimestamp,
      }));

      return ok({
        totalRequests: records.length,
        successfulRequests,
        failedRequests,
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        averageDurationMs,
        recentUsage,
      });
    } catch (err: any) {
      logger.error(
        {
          err: err.message,
          userId,
        },
        '[AIUsageRepository] Unexpected error in getUserAnalyticsSummary'
      );
      return fail(new AppError('Failed to aggregate consumer AI usage', 500));
    }
  }
}

export const aiUsageRepository = new AIUsageRepository();
