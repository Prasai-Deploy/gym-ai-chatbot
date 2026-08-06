import { AgentId, AgentContext, MemoryRecord } from './agent.types';
import { logger } from '@logger/index';

// In-memory store (swap for Supabase/Redis in production)
const memoryStore = new Map<string, MemoryRecord[]>();

export class MemoryEngine {
  private getKey(userId: string): string {
    return `memory:${userId}`;
  }

  public remember(userId: string, key: string, value: string, ttlDays = 30): void {
    const storeKey = this.getKey(userId);
    const existing = memoryStore.get(storeKey) || [];
    const filtered = existing.filter((r) => r.key !== key);

    filtered.push({
      userId,
      key,
      value,
      ttlDays,
      createdAt: new Date().toISOString(),
    });

    memoryStore.set(storeKey, filtered);
    logger.info(`[MemoryEngine] Stored memory for user ${userId}: ${key}`);
  }

  public recall(userId: string, key: string): string | null {
    const storeKey = this.getKey(userId);
    const records = memoryStore.get(storeKey) || [];
    const record = records.find((r) => r.key === key);
    return record?.value || null;
  }

  public buildContextSummary(userId: string, agentId: AgentId): string {
    const storeKey = this.getKey(userId);
    const records = memoryStore.get(storeKey) || [];

    if (records.length === 0) return '';

    const lines = records.map((r) => `- ${r.key}: ${r.value}`).join('\n');
    return `\n\n[Long-term Memory for Agent: ${agentId}]\n${lines}`;
  }

  public clearMemory(userId: string): void {
    memoryStore.delete(this.getKey(userId));
  }
}

export const memoryEngine = new MemoryEngine();
