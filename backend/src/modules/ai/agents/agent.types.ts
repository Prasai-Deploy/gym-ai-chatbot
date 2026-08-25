import { ChatMessage } from '../providers/IAIProvider';

export type AgentId =
  | 'fitness_coach'
  | 'nutrition'
  | 'recovery'
  | 'trainer_copilot'
  | 'business_advisor'
  | 'support';

export interface AgentContext {
  userId: string;
  organizationId: string;
  conversationId: string;
  userRole: string;
  agentId: AgentId;
  memoryContext?: string;
  toolResults?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>, context: AgentContext) => Promise<any>;
}

export interface AgentResponse {
  agentId: AgentId;
  message: ChatMessage;
  toolsCalled?: string[];
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  tokensUsed?: number;
  model?: string;
  provider?: string;
  durationMs?: number;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  triggerKeywords: string[];
}

export interface MemoryRecord {
  id?: string;
  userId: string;
  organizationId: string;
  agentId: AgentId | string;
  key: string;
  value: string;
  ttlDays?: number;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsageAnalytics {
  id?: string;
  agentId: AgentId | string;
  organizationId: string;
  userId: string;
  sessionId?: string;
  provider: string;
  model: string;
  requestTimestamp: string;
  durationMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  toolCallsCount: number;
  toolsCalled: string[];
  success: boolean;
  errorCategory?: string | null;
  createdAt?: string;
  tokensUsed?: number;
}
