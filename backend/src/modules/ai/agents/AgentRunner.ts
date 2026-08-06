import { AgentContext, AgentResponse, UsageAnalytics } from './agent.types';
import { AgentOrchestrator } from './AgentOrchestrator';
import { MemoryEngine } from './MemoryEngine';
import { IAIProvider, ChatMessage } from '../providers/IAIProvider';
import { logger } from '@logger/index';

// Usage analytics store (in-memory; swap for DB in production)
const analyticsLog: UsageAnalytics[] = [];

export class AgentRunner {
  private orchestrator: AgentOrchestrator;
  private memoryEngine: MemoryEngine;

  constructor(private readonly provider: IAIProvider) {
    this.orchestrator = new AgentOrchestrator();
    this.memoryEngine = new MemoryEngine();
  }

  public async run(
    userMessage: string,
    context: Omit<AgentContext, 'agentId'>,
    conversationHistory: ChatMessage[] = []
  ): Promise<AgentResponse> {
    const startMs = Date.now();

    // 1. Route to best agent
    const agentId = this.orchestrator.routeMessage(userMessage, context.userRole);
    const agentDef = this.orchestrator.getAgentDefinition(agentId);

    logger.info(`[AgentRunner] Routing message to agent '${agentId}' for user ${context.userId}`);

    // 2. Build long-term memory context
    const memoryContext = this.memoryEngine.buildContextSummary(context.userId, agentId);

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

    // 5. Execute AI completion
    const response = await this.provider.generateCompletion(messages, toolDefinitions);

    // 6. Handle tool calls
    const toolsCalled: string[] = [];
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
          finalMessage = finalResponse.message;
        }
      }
    }

    const durationMs = Date.now() - startMs;

    // 7. Track usage analytics
    const usage: UsageAnalytics = {
      agentId,
      organizationId: context.organizationId,
      userId: context.userId,
      tokensUsed: 0, // Populated from provider metadata in production
      model: 'groq/llama-3.1-8b-instant',
      durationMs,
      toolsCalled,
      timestamp: new Date().toISOString(),
    };
    analyticsLog.push(usage);

    return {
      agentId,
      message: finalMessage,
      toolsCalled,
      durationMs,
      model: usage.model,
    };
  }

  public getAnalytics(): UsageAnalytics[] {
    return analyticsLog;
  }
}
