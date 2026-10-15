import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@database/supabase';
import { StructuredMemoryRecord, MemoryCategory, MemoryValuePayload } from './memory.types';
import { logger } from '@logger/index';

export class MemoryRetriever {
  constructor(private readonly supabase: SupabaseClient = supabaseAdmin) {}

  /**
   * Retrieves relevant structured memories for the authenticated user and agent context.
   */
  public async getRelevantMemories(
    userId: string,
    organizationId: string,
    agentId: string = 'trinetra',
    promptText?: string
  ): Promise<StructuredMemoryRecord[]> {
    if (!userId) {
      return [];
    }

    try {
      let query = this.supabase
        .from('ai_agent_memories')
        .select('*')
        .eq('user_id', userId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        logger.warn({ err: error.message, userId, organizationId }, '[MemoryRetriever] Failed to query memories');
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const now = new Date().toISOString();
      const validRows = data.filter((row: any) => !row.expires_at || row.expires_at > now);

      const records: StructuredMemoryRecord[] = validRows.map((row: any) => this.parseMemoryRecord(row));
      const activeRecords = records.filter((r) => r.active);

      if (!promptText || promptText.trim().length === 0) {
        return activeRecords;
      }

      return this.filterByRelevance(activeRecords, promptText);
    } catch (err: any) {
      logger.error({ err: err.message, userId }, '[MemoryRetriever] Error in getRelevantMemories()');
      return [];
    }
  }

  /**
   * Formats structured memories into a concise text block for system prompt composition.
   */
  public formatMemorySummary(memories: StructuredMemoryRecord[]): string {
    if (!memories || memories.length === 0) {
      return '';
    }

    const lines = memories.map((m) => {
      if (m.key.includes(':')) {
        return `- [${m.category}] ${m.key}: ${m.value} (source: ${m.source}, confidence: ${m.confidence})`;
      }
      return `- ${m.key}: ${m.value}`;
    });

    return lines.join('\n');
  }

  private parseMemoryRecord(row: any): StructuredMemoryRecord {
    const rawKey: string = row.memory_key || '';
    const rawVal: string = row.memory_value || '';

    let category: MemoryCategory = 'PREFERENCES';
    let key = rawKey;

    if (rawKey.includes(':')) {
      const parts = rawKey.split(':');
      category = parts[0] as MemoryCategory;
      key = parts.slice(1).join(':');
    }

    try {
      const parsed = JSON.parse(rawVal) as MemoryValuePayload;
      if (parsed && typeof parsed === 'object' && parsed.value) {
        return {
          id: row.id,
          userId: row.user_id,
          organizationId: row.organization_id,
          agentId: row.agent_id,
          category: parsed.category || category,
          key: parsed.key || key,
          value: parsed.value,
          confidence: parsed.confidence || 'high',
          source: parsed.source || 'explicit',
          active: parsed.active !== undefined ? parsed.active : true,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastConfirmedAt: parsed.last_confirmed_at || row.updated_at,
        };
      }
    } catch {
      // Plain string value fallback
    }

    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      agentId: row.agent_id,
      category,
      key,
      value: rawVal,
      confidence: 'high',
      source: 'explicit',
      active: true,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private filterByRelevance(
    records: StructuredMemoryRecord[],
    promptText: string
  ): StructuredMemoryRecord[] {
    const text = promptText.toLowerCase();

    const isWorkout = /(?:workout|exercise|training|plan|squat|bench|lift|gym|sets|reps)/i.test(text);
    const isNutrition = /(?:eat|meal|food|diet|protein|macro|calorie|water|drink|fasting|vegetarian|vegan)/i.test(text);
    const isRecovery = /(?:sleep|sore|readiness|recovery|rest|fatigue|pain|tired)/i.test(text);

    if (isWorkout) {
      const workoutCategories: Set<MemoryCategory> = new Set(['TRAINING', 'EQUIPMENT', 'SCHEDULE', 'GOALS', 'FITNESS', 'COACHING_STYLE']);
      const filtered = records.filter((r) => workoutCategories.has(r.category));
      return filtered.length > 0 ? filtered : records;
    }

    if (isNutrition) {
      const nutritionCategories: Set<MemoryCategory> = new Set(['NUTRITION', 'GOALS', 'HABITS', 'PROFILE', 'PREFERENCES', 'COACHING_STYLE']);
      const filtered = records.filter((r) => nutritionCategories.has(r.category));
      return filtered.length > 0 ? filtered : records;
    }

    if (isRecovery) {
      const recoveryCategories: Set<MemoryCategory> = new Set(['RECOVERY', 'HABITS', 'TRAINING', 'SCHEDULE', 'COACHING_STYLE']);
      const filtered = records.filter((r) => recoveryCategories.has(r.category));
      return filtered.length > 0 ? filtered : records;
    }

    return records;
  }
}

export const memoryRetriever = new MemoryRetriever();
