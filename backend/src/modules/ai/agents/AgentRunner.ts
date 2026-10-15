import { AgentContext, AgentResponse, UsageAnalytics, ConsumerAnalyticsSummary } from './agent.types';
import { AgentOrchestrator } from './AgentOrchestrator';
import { MemoryEngine } from './MemoryEngine';
import { memoryExtractor } from './MemoryExtractor';
import { IAIProvider, ChatMessage } from '../providers/IAIProvider';
import { AIUsageRepository } from '../repositories/AIUsageRepository';
import { AIProviderError } from '../providers/AIProviderError';
import { PromptGuard } from '../safety/PromptGuard';
import { RateLimitGuard } from '../safety/RateLimitGuard';
import { safetyPolicy } from '../safety/SafetyPolicy';
import { Result } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { ToolExecutor } from '../core/ToolExecutor';
import { ContextBuilder } from '../core/ContextBuilder';
import { PromptComposer } from '../core/PromptComposer';
import { ConversationManager } from '../core/ConversationManager';
import { StreamManager } from '../core/StreamManager';
import { toolRegistry, ToolRegistry } from '../tools/ToolRegistry';
import { B2BContextBuilder } from '../core/B2BContextBuilder';
import { supabase } from '@database/supabase';
import { logger } from '@logger/index';
import { Response } from 'express';

export class AgentRunner {
  private orchestrator: AgentOrchestrator;
  private promptGuard = new PromptGuard();
  private rateLimitGuard = new RateLimitGuard();
  private toolExecutor: ToolExecutor;
  private promptComposer = new PromptComposer();
  private convManager: ConversationManager;

  constructor(
    private readonly provider: IAIProvider,
    private readonly memoryEngine: MemoryEngine = new MemoryEngine(supabase),
    private readonly usageRepo: AIUsageRepository = new AIUsageRepository(supabase),
    private readonly contextBuilder?: ContextBuilder,
    private readonly registry: ToolRegistry = toolRegistry,
    private readonly b2bContextBuilder?: B2BContextBuilder
  ) {
    this.orchestrator = new AgentOrchestrator();
    this.toolExecutor = new ToolExecutor(this.registry, supabase);
    this.convManager = new ConversationManager(supabase);
  }

  public async run(
    userMessage: string,
    context: Omit<AgentContext, 'agentId'>,
    conversationHistory: ChatMessage[] = [],
    res?: Response,
    isStream: boolean = false
  ): Promise<AgentResponse> {
    const startMs = Date.now();
    const requestTimestamp = new Date().toISOString();
    const isAdvisorScope = context.scope === 'organization_advisor';

    // 1. Safety, Payload Size & Rate Limit Guards
    if (conversationHistory.length > 20) {
      const err = new ValidationError('Conversation context size limit exceeded (maximum 20 messages)');
      if (res && isStream) {
        new StreamManager().sendError(res, err.message, 'CONTEXT_SIZE_EXCEEDED');
      }
      throw err;
    }

    const guardRes = this.promptGuard.validatePrompt(userMessage);
    if (guardRes.isFailure()) {
      this.rateLimitGuard.recordFailure(context.userId);
      if (res && isStream) {
        new StreamManager().sendError(res, guardRes.error.message, 'SAFETY_VIOLATION');
      }
      throw guardRes.error;
    }

    const rateRes = this.rateLimitGuard.checkRateLimit(context.userId);
    if (rateRes.isFailure()) {
      if (res && isStream) {
        new StreamManager().sendError(res, rateRes.error.message, 'RATE_LIMIT_EXCEEDED');
      }
      throw rateRes.error;
    }

    // 1b. Safety Policy Evaluation (Medical Boundaries & High-Risk Refusal)
    const safetyEval = safetyPolicy.evaluatePrompt(userMessage);
    if (safetyEval.isFailure()) {
      this.rateLimitGuard.recordFailure(context.userId);
      if (res && isStream) {
        new StreamManager().sendError(res, safetyEval.error.message, 'PROMPT_BLOCKED');
      }
      throw safetyEval.error;
    }

    const safetyRes = safetyEval.value;
    if (!safetyRes.safe && safetyRes.safeResponse) {
      const safeMsg: ChatMessage = { role: 'assistant', content: safetyRes.safeResponse };

      // Record safe analytics
      const usageRecord: UsageAnalytics = {
        agentId: isAdvisorScope ? 'business_advisor' : 'trinetra',
        organizationId: context.organizationId || null,
        userId: context.userId,
        sessionId: context.conversationId,
        provider: 'safety_policy',
        model: 'deterministic_guard',
        requestTimestamp,
        durationMs: Date.now() - startMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        toolCallsCount: 0,
        toolsCalled: [],
        success: true,
        errorCategory: null,
      };
      await this.usageRepo.recordUsage(usageRecord).catch(() => {});

      if (res && isStream) {
        const streamMgr = new StreamManager();
        streamMgr.sendToken(res, safetyRes.safeResponse);
        streamMgr.sendDone(res, {
          message: safetyRes.safeResponse,
          conversationId: context.conversationId,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        });
      }

      return {
        agentId: isAdvisorScope ? 'business_advisor' : 'fitness_coach',
        message: safeMsg,
        toolsCalled: [],
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        tokensUsed: 0,
        model: 'deterministic_guard',
        provider: 'safety_policy',
        durationMs: Date.now() - startMs,
      };
    }

    // 2. Route Agent
    const agentId = isAdvisorScope
      ? 'business_advisor'
      : this.orchestrator.routeMessage(userMessage, context.userRole);
    const agentDef = this.orchestrator.getAgentDefinition(agentId);

    logger.info(`[AgentRunner] Routing message to agent '${agentId}' for user ${context.userId}`);

    // 3. Extract Memory Candidates & Build Long-term Context Summary
    let memoryContext = '';
    let contextSummary = '';

    if (!isAdvisorScope) {
      try {
        const candidates = memoryExtractor.extractCandidates(
          userMessage,
          context.userId,
          context.organizationId || '',
          agentId
        );
        for (const candidate of candidates) {
          await this.memoryEngine.persistCandidate(candidate, context.userId, context.organizationId || '');
        }
      } catch (err) {
        logger.warn({ err }, '[AgentRunner] Error processing memory candidates');
      }

      memoryContext = await this.memoryEngine.buildContextSummary(
        context.userId,
        agentId,
        context.organizationId || undefined,
        userMessage
      );

      if (this.contextBuilder) {
        try {
          const ctxData = await this.contextBuilder.buildContext(context.userId);
          contextSummary = this.contextBuilder.formatContextSummary(ctxData);
        } catch (err) {
          logger.warn({ err }, '[AgentRunner] ContextBuilder error, defaulting to empty context');
        }
      }
    } else {
      // Organization Business Intelligence Scope: isolate from member personal fitness memory
      if (this.b2bContextBuilder && context.organizationId) {
        try {
          const b2bCtx = await this.b2bContextBuilder.buildContext(
            context.organizationId,
            context.userId,
            context.userRole
          );
          contextSummary = this.b2bContextBuilder.formatContextSummary(b2bCtx);
        } catch (err) {
          logger.warn({ err }, '[AgentRunner] B2BContextBuilder error, defaulting to empty business context');
        }
      }
    }

    // 4. Build System Prompt & Messages
    const baseSystemPrompt = isAdvisorScope
      ? `You are TRINETRA, the executive AI advisor for STRIVA Gym Owners and Operations Managers.
Your role is to provide calm, analytical, and data-driven business intelligence across gym operations, member growth, attendance patterns, trainer allocations, retention metrics, and organizational billing.

Operating Rules:
1. Always base your answers on verified operational data retrieved via your registered tools.
2. If data is insufficient or historical data is missing, clearly explain that rather than inventing estimates.
3. You are strictly read-only. You cannot mutate member data, cancel subscriptions, or alter records. Direct the user to the appropriate Owner OS section for manual mutations.
4. Keep answers professional, concise, structured, and focused on business health and actionable insights.
5. Never expose raw backend exceptions, internal database IDs, or payment credentials.
6. The exclusive brand identity is TRINETRA. Never refer to legacy names.`
      : agentDef.systemPrompt;

    const systemPrompt = this.promptComposer.composeSystemPrompt(
      contextSummary ? `${baseSystemPrompt}\n\n${contextSummary}` : baseSystemPrompt,
      memoryContext
    );

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage },
    ];

    // 5. Gather registered tools
    const toolDefinitions = this.registry.getAllDefinitions();

    let promptTokensAcc: number | null = null;
    let completionTokensAcc: number | null = null;
    let totalTokensAcc: number | null = null;
    let providerName = 'groq';
    let modelName = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';
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

    const streamManager = new StreamManager();

    try {
      // 6. Generate AI Completion
      const response = await this.provider.generateCompletion(messages, toolDefinitions);
      providerName = response.provider || providerName;
      modelName = response.model || modelName;
      addUsage(response.usage);

      let finalMessage = response.message;

      // Stream tokens if streaming mode
      if (res && isStream && finalMessage.content) {
        streamManager.sendToken(res, finalMessage.content);
      }

      // 7. Tool Execution Loop (Bounded to max 5 executions per request)
      const MAX_TOOL_CALLS = 5;
      let toolCallCount = 0;
      let currentResponse = response;
      const conversationMessages: ChatMessage[] = [...messages];

      while (
        currentResponse.finish_reason === 'tool_calls' &&
        currentResponse.message?.tool_calls &&
        currentResponse.message.tool_calls.length > 0 &&
        toolCallCount < MAX_TOOL_CALLS
      ) {
        conversationMessages.push(currentResponse.message);

        for (const toolCall of currentResponse.message.tool_calls) {
          if (toolCallCount >= MAX_TOOL_CALLS) {
            logger.warn(`[AgentRunner] Tool execution limit (${MAX_TOOL_CALLS}) reached for user ${context.userId}`);
            break;
          }
          toolCallCount++;

          const toolName = toolCall.function?.name;
          const args = toolCall.function?.arguments;

          if (res && isStream) {
            streamManager.sendToolCall(res, toolName, args);
          }

          const toolRes = await this.toolExecutor.executeToolCall(
            toolName,
            args,
            { userId: context.userId, organizationId: context.organizationId || undefined, userRole: context.userRole },
            context.conversationId
          );

          const toolOutput = toolRes.isSuccess() ? toolRes.value : { error: toolRes.error.message };
          toolsCalled.push(toolName);

          if (res && isStream) {
            streamManager.sendToolResult(res, toolName, toolOutput);
          }

          conversationMessages.push({
            role: 'tool',
            content: JSON.stringify(toolOutput),
            tool_call_id: toolCall.id,
          });
        }

        const nextResponse = await this.provider.generateCompletion(conversationMessages, toolDefinitions);
        addUsage(nextResponse.usage);
        currentResponse = nextResponse;
        finalMessage = nextResponse.message;

        if (res && isStream && finalMessage.content) {
          streamManager.sendToken(res, finalMessage.content);
        }
      }

      const durationMs = Date.now() - startMs;

      // 8. Track and persist real usage analytics
      const usageRecord: UsageAnalytics = {
        agentId,
        organizationId: context.organizationId || null,
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

      const usageRes = await this.usageRepo.recordUsage(usageRecord);
      if (usageRes && typeof usageRes.isFailure === 'function' && usageRes.isFailure()) {
        logger.warn({ err: usageRes.error?.message }, '[AgentRunner] Failed to persist usage record');
      }

      if (res && isStream) {
        streamManager.sendDone(res, {
          message: finalMessage.content,
          conversationId: context.conversationId,
          usage: { promptTokens: promptTokensAcc, completionTokens: completionTokensAcc, totalTokens: totalTokensAcc },
        });
      }

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

      const failedUsageRecord: UsageAnalytics = {
        agentId,
        organizationId: context.organizationId || null,
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

      await this.usageRepo.recordUsage(failedUsageRecord).catch((repoErr: any) => {
        logger.error({ err: repoErr?.message || String(repoErr) }, '[AgentRunner] Failed to persist failed usage record');
      });

      if (res && isStream) {
        streamManager.sendError(res, err.message, errorCategory);
      }

      throw err;
    }
  }

  public async getAnalytics(organizationId: string, limit = 50): Promise<UsageAnalytics[]> {
    const res = await this.usageRepo.getUsageByOrganization(organizationId, limit);
    return res.isSuccess() ? res.value : [];
  }

  public async getUserAnalytics(userId: string, limit = 50): Promise<UsageAnalytics[]> {
    const res = await this.usageRepo.getUserUsage(userId, limit);
    return res.isSuccess() ? res.value : [];
  }

  public async getUserAnalyticsSummary(
    userId: string,
    limit = 50
  ): Promise<Result<ConsumerAnalyticsSummary, AppError>> {
    return this.usageRepo.getUserAnalyticsSummary(userId, limit);
  }
}
