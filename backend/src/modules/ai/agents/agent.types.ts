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
  tokensUsed?: number;
  model?: string;
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
  userId: string;
  key: string;
  value: string;
  ttlDays?: number;
  createdAt: string;
}

export interface UsageAnalytics {
  agentId: AgentId;
  organizationId: string;
  userId: string;
  tokensUsed: number;
  model: string;
  durationMs: number;
  toolsCalled: string[];
  timestamp: string;
}
