import { SupabaseClient } from '@supabase/supabase-js';
import { AgentId, MemoryRecord } from './agent.types';
import { MemoryCandidate, StructuredMemoryRecord, MemoryValuePayload } from './memory.types';
import { memoryPolicy } from './MemoryPolicy';
import { MemoryRetriever } from './MemoryRetriever';
import { supabaseAdmin } from '@database/supabase';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { logger } from '@logger/index';

export class MemoryEngine {
  constructor(private readonly supabase: SupabaseClient = supabaseAdmin) {}

  /**
   * Persists a validated memory candidate following Phase 6B safety and conflict rules.
   */
  public async persistCandidate(
    candidate: MemoryCandidate,
    callerUserId: string,
    callerOrgId: string
  ): Promise<Result<StructuredMemoryRecord, AppError>> {
    try {
      const validationRes = memoryPolicy.validateCandidate(candidate, callerUserId, callerOrgId);
      if (validationRes.isFailure()) {
        return fail(validationRes.error);
      }

      const agentId = candidate.agentId || 'trinetra';
      const dbMemoryKey = `${candidate.category}:${candidate.key}`;
      const nowIso = new Date().toISOString();

      const valuePayload: MemoryValuePayload = {
        category: candidate.category,
        key: candidate.key,
        value: candidate.value,
        confidence: candidate.confidence,
        source: candidate.source,
        last_confirmed_at: candidate.lastConfirmedAt || nowIso,
        active: true,
      };

      const dbPayload = {
        user_id: candidate.userId,
        organization_id: candidate.organizationId,
        agent_id: agentId,
        memory_key: dbMemoryKey,
        memory_value: JSON.stringify(valuePayload),
        updated_at: nowIso,
      };

      const { data, error } = await this.supabase
        .from('ai_agent_memories')
        .upsert(dbPayload, { onConflict: 'user_id,organization_id,agent_id,memory_key' })
        .select()
        .single();

      if (error) {
        logger.error(
          { err: error.message, userId: candidate.userId, key: dbMemoryKey },
          '[MemoryEngine] Failed to persist candidate to ai_agent_memories'
        );
        return fail(new AppError(`Database persistence failure for AI memory: ${error.message}`, 500));
      }

      const record: StructuredMemoryRecord = {
        id: data.id,
        userId: data.user_id,
        organizationId: data.organization_id,
        agentId: data.agent_id,
        category: candidate.category,
        key: candidate.key,
        value: candidate.value,
        confidence: candidate.confidence,
        source: candidate.source,
        active: true,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastConfirmedAt: valuePayload.last_confirmed_at,
      };

      return ok(record);
    } catch (err: any) {
      logger.error({ err: err.message }, '[MemoryEngine] Error in persistCandidate()');
      return fail(new AppError(err.message || 'Failed to persist candidate', 500));
    }
  }

  /**
   * Deactivates a specific memory key for a user without deleting history if supported.
   */
  public async deactivateMemory(
    userId: string,
    key: string,
    organizationId: string,
    agentId: string = 'trinetra'
  ): Promise<Result<void, AppError>> {
    try {
      if (!userId || !organizationId) {
        return fail(new ValidationError('User ID and Organization ID required to deactivate memory'));
      }

      const { error } = await this.supabase
        .from('ai_agent_memories')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('agent_id', agentId)
        .eq('memory_key', key);

      if (error) {
        return fail(new AppError(`Failed to deactivate memory: ${error.message}`, 500));
      }

      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message || 'Error deactivating memory', 500));
    }
  }

  /**
   * Persists or updates a long-term memory for a user, organization, and agent (Legacy/compat API).
   */
  public async remember(
    userId: string,
    key: string,
    value: string,
    ttlDays: number = 30,
    organizationId?: string,
    agentId: AgentId | string = 'trinetra'
  ): Promise<Result<MemoryRecord, AppError>> {
    try {
      if (!userId || userId.trim() === '') {
        return fail(new ValidationError('User ID is required for AI memory'));
      }
      if (!organizationId || organizationId.trim() === '') {
        return fail(new ValidationError('Organization ID is required for multi-tenant AI memory (fail-closed)'));
      }
      if (!key || key.trim() === '') {
        return fail(new ValidationError('Memory key is required'));
      }

      let expiresAt: string | null = null;
      if (ttlDays && ttlDays > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + ttlDays);
        expiresAt = expDate.toISOString();
      }

      const payload = {
        user_id: userId,
        organization_id: organizationId,
        agent_id: agentId,
        memory_key: key.trim(),
        memory_value: value,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('ai_agent_memories')
        .upsert(payload, { onConflict: 'user_id,organization_id,agent_id,memory_key' })
        .select()
        .single();

      if (error) {
        logger.error({ err: error.message, userId, agentId, key }, '[MemoryEngine] Failed to persist memory to database');
        return fail(new AppError(`Database persistence failure for AI memory: ${error.message}`, 500));
      }

      const record: MemoryRecord = {
        id: data.id,
        userId: data.user_id,
        organizationId: data.organization_id,
        agentId: data.agent_id,
        key: data.memory_key,
        value: data.memory_value,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return ok(record);
    } catch (err: any) {
      logger.error({ err: err.message, userId, key }, '[MemoryEngine] Unexpected error in remember()');
      return fail(new AppError(err.message || 'Failed to store memory', 500));
    }
  }

  /**
   * Recalls a specific memory key for a user and agent, respecting TTL expiration.
   */
  public async recall(
    userId: string,
    key: string,
    organizationId?: string,
    agentId?: AgentId | string
  ): Promise<Result<string | null, AppError>> {
    try {
      if (!userId) {
        return fail(new ValidationError('User ID is required for AI memory recall'));
      }

      let query = this.supabase
        .from('ai_agent_memories')
        .select('memory_value, expires_at')
        .eq('user_id', userId)
        .eq('memory_key', key.trim());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        return fail(new AppError(`Database query failure for AI memory recall: ${error.message}`, 500));
      }

      if (!data || data.length === 0) {
        return ok(null);
      }

      const now = new Date().toISOString();
      const validRecords = data.filter((row: any) => !row.expires_at || row.expires_at > now);

      if (validRecords.length === 0) {
        return ok(null);
      }

      return ok(validRecords[0].memory_value);
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to recall memory', 500));
    }
  }

  /**
   * Builds the formatted long-term memory context summary block for prompt injection.
   */
  public async buildContextSummary(
    userId: string,
    agentId: AgentId | string,
    organizationId?: string,
    promptText?: string
  ): Promise<string> {
    try {
      if (!userId) return '';
      const orgId = organizationId || '';

      const retriever = new MemoryRetriever(this.supabase);
      const memories = await retriever.getRelevantMemories(userId, orgId, String(agentId), promptText);

      if (!memories || memories.length === 0) return '';

      const lines = memories.map((m) => {
        if (m.key.includes(':')) {
          return `- [${m.category}] ${m.key}: ${m.value} (source: ${m.source}, confidence: ${m.confidence})`;
        }
        return `- ${m.key}: ${m.value}`;
      }).join('\n');

      return `\n\n[Long-term Memory for Agent: ${agentId}]\n${lines}`;
    } catch (err: any) {
      logger.error({ err: err.message, userId, agentId }, '[MemoryEngine] Error in buildContextSummary');
      return '';
    }
  }

  /**
   * Clears memories for a user, optionally scoped to organization and agent.
   */
  public async clearMemory(
    userId: string,
    organizationId?: string,
    agentId?: AgentId | string
  ): Promise<Result<void, AppError>> {
    try {
      if (!userId) return fail(new ValidationError('User ID is required'));

      let query = this.supabase.from('ai_agent_memories').delete().eq('user_id', userId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { error } = await query;
      if (error) {
        return fail(new AppError(`Failed to clear memories: ${error.message}`, 500));
      }

      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to clear memories', 500));
    }
  }
}

export const memoryEngine = new MemoryEngine();
