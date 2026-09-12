import { AgentContext, AgentResponse, UsageAnalytics } from './agent.types';
import { AgentOrchestrator } from './AgentOrchestrator';
import { MemoryEngine } from './MemoryEngine';
import { IAIProvider, ChatMessage } from '../providers/IAIProvider';
import { AIUsageRepository } from '../repositories/AIUsageRepository';
import { AIProviderError } from '../providers/AIProviderError';
import { logger } from '@logger/index';

export class AgentRunner {
  private orchestrator: AgentOrchestrator;

  constructor(
    private readonly provider: IAIProvider,
    private readonly memoryEngine: MemoryEngine = new MemoryEngine(),
    private readonly usageRepo: AIUsageRepository = new AIUsageRepository()
  ) {
    this.orchestrator = new AgentOrchestrator();
  }

  public async run(
    userMessage: string,
    context: Omit<AgentContext, 'agentId'>,
    conversationHistory: ChatMessage[] = []
  ): Promise<AgentResponse> {
    const startMs = Date.now();
    const requestTimestamp = new Date().toISOString();

    // 1. Route to best agent
    const agentId = this.orchestrator.routeMessage(userMessage, context.userRole);
    const agentDef = this.orchestrator.getAgentDefinition(agentId);

    logger.info(`[AgentRunner] Routing message to agent '${agentId}' for user ${context.userId}`);

    // 2. Build long-term memory context asynchronously from persistent storage
    const memoryContext = await this.memoryEngine.buildContextSummary(
      context.userId,
      agentId,
      context.organizationId
    );

    const agentContext: AgentContext = {
      ...context,
      agentId,
      memoryContext,
    };

    // 3. Build messages with system prompt + memory injection
    const systemPrompt = agentDef.systemPrompt + memoryContext;
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 turns for context window
      { role: 'user', content: userMessage },
    ];

    // 4. Convert agent tools to provider tool definitions
    const toolDefinitions = agentDef.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
        },
      },
    }));

    let promptTokensAcc: number | null = null;
    let completionTokensAcc: number | null = null;
    let totalTokensAcc: number | null = null;
    let providerName = 'groq';
    let modelName = 'compound-beta';
    const toolsCalled: string[] = [];

    const addUsage = (usage: any) => {
      if (!usage) return;
      if (typeof usage.prompt_tokens === 'number') {
        promptTokensAcc = (promptTokensAcc ?? 0) + usage.prompt_tokens;
      }
      if (typeof usage.completion_tokens === 'number') {
        completionTokensAcc = (completionTokensAcc ?? 0) + usage.completion_tokens;
      }
      if (typeof usage.total_tokens === 'number') {
        totalTokensAcc = (totalTokensAcc ?? 0) + usage.total_tokens;
      }
    };

    try {
      // 5. Execute AI completion
      const response = await this.provider.generateCompletion(messages, toolDefinitions);
      providerName = response.provider || providerName;
      modelName = response.model || modelName;
      addUsage(response.usage);

      // 6. Handle tool calls
      let finalMessage = response.message;

      if (response.finish_reason === 'tool_calls' && response.message.tool_calls) {
        for (const toolCall of response.message.tool_calls) {
          const tool = agentDef.tools.find((t) => t.name === toolCall.function?.name);
          if (tool) {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const result = await tool.execute(args, agentContext);
            toolsCalled.push(tool.name);

            // Re-run with tool results
            const toolResultMessages: ChatMessage[] = [
              ...messages,
              response.message,
              { role: 'tool', content: JSON.stringify(result), tool_call_id: toolCall.id },
            ];
            const finalResponse = await this.provider.generateCompletion(toolResultMessages, []);
            addUsage(finalResponse.usage);
            finalMessage = finalResponse.message;
          }
        }
      }

      const durationMs = Date.now() - startMs;

      // 7. Track and persist real usage analytics
      const usageRecord: UsageAnalytics = {
        agentId,
        organizationId: context.organizationId,
        userId: context.userId,
        sessionId: context.conversationId,
        provider: providerName,
        model: modelName,
        requestTimestamp,
        durationMs,
        promptTokens: promptTokensAcc,
        completionTokens: completionTokensAcc,
        totalTokens: totalTokensAcc,
        toolCallsCount: toolsCalled.length,
        toolsCalled,
        success: true,
        errorCategory: null,
      };

      // Persist to Supabase
      await this.usageRepo.recordUsage(usageRecord);

      return {
        agentId,
        message: finalMessage,
        toolsCalled,
        promptTokens: promptTokensAcc,
        completionTokens: completionTokensAcc,
        totalTokens: totalTokensAcc,
        tokensUsed: totalTokensAcc ?? undefined,
        model: modelName,
        provider: providerName,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      const errorCategory = err instanceof AIProviderError ? err.category : 'UNEXPECTED_ERROR';

      // Persist failed invocation record
      const failedUsageRecord: UsageAnalytics = {
        agentId,
        organizationId: context.organizationId,
        userId: context.userId,
        sessionId: context.conversationId,
        provider: providerName,
        model: modelName,
        requestTimestamp,
        durationMs,
        promptTokens: promptTokensAcc,
        completionTokens: completionTokensAcc,
        totalTokens: totalTokensAcc,
        toolCallsCount: toolsCalled.length,
        toolsCalled,
        success: false,
        errorCategory,
      };

      await this.usageRepo.recordUsage(failedUsageRecord).catch((repoErr) => {
        logger.error({ repoErr }, '[AgentRunner] Failed to persist failed usage record');
      });

      // Propagate error explicitly (no silent swallowing or fake stubs)
      throw err;
    }
  }

  /**
   * Queries real persisted analytics records from Supabase.
   */
  public async getAnalytics(organizationId: string, limit = 50): Promise<UsageAnalytics[]> {
    const res = await this.usageRepo.getUsageByOrganization(organizationId, limit);
    return res.isSuccess() ? res.value : [];
  }
}
