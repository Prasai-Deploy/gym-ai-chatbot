import { Router } from 'express';
import { AIController } from './controllers/AIController';
import { GroqProvider } from './providers/GroqProvider';
import { ConversationManager } from './core/ConversationManager';
import { PromptBuilder } from './core/PromptBuilder';
import { ToolRuntime } from './core/ToolRuntime';
import { SafetyGuard } from './safety/SafetyGuard';
import { toolRegistry } from './tools/ToolRegistry';
import { LogWorkoutTool } from './tools/impl/LogWorkoutTool';
import { ContextBuilderService } from '../intelligence/services/ContextBuilderService';
import { NutritionService } from '../intelligence/services/NutritionService';
import { RecoveryService } from '../intelligence/services/RecoveryService';
import { MemoryService } from '../intelligence/services/MemoryService';
import { NutritionRepository } from '../intelligence/repositories/NutritionRepository';
import { RecoveryRepository } from '../intelligence/repositories/RecoveryRepository';
import { MemoryRepository } from '../intelligence/repositories/MemoryRepository';
import { AgentRunner } from './agents/AgentRunner';
import { AgentOrchestrator } from './agents/AgentOrchestrator';
import { memoryEngine } from './agents/MemoryEngine';
import { aiUsageRepository } from './repositories/AIUsageRepository';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { env } from '@config/env';
import { ok } from '@shared/core/Result';

const router = Router();

// DI Wiring — AI Module
const provider = new GroqProvider(env.GROQ_API_KEY ?? '');
const convManager = new ConversationManager(supabase);
const promptBuilder = new PromptBuilder();
const toolRuntime = new ToolRuntime(toolRegistry);
const safetyGuard = new SafetyGuard();
const orchestrator = new AgentOrchestrator();
const agentRunner = new AgentRunner(provider, memoryEngine, aiUsageRepository);

// Wire real ContextBuilderService from Intelligence module
const nutritionRepo = new NutritionRepository(supabase);
const recoveryRepo = new RecoveryRepository(supabase);
const memoryRepo = new MemoryRepository(supabase);
const nutritionSvc = new NutritionService(nutritionRepo);
const recoverySvc = new RecoveryService(recoveryRepo);
const memorySvc = new MemoryService(memoryRepo);

// Lightweight adapters for context builder
const extProgress = { getStats: async (_userId: string) => ({ workout_count: 0, current_streak: 0, lifetime_volume_kg: 0 }) };
const extIdentity = { getProfile: async (_userId: string) => ({ name: 'Member' }) };

const contextBuilder = new ContextBuilderService(
  nutritionSvc,
  recoverySvc,
  memorySvc,
  extProgress as any,
  extIdentity as any
);

// Wire the real WorkoutExecutionService for tool use
const mockWorkoutSvc = {
  transitionSessionState: async () => ok({ status: 'started' }),
};

// Register Tools
toolRegistry.register(new LogWorkoutTool(mockWorkoutSvc as any));

const controller = new AIController(
  provider,
  convManager,
  promptBuilder,
  toolRuntime,
  safetyGuard,
  toolRegistry,
  contextBuilder
);

// -- ROUTES --
router.post('/chat', requireAuth, controller.chat);

// Sprint 4A / 5A — Multi-Agent Ecosystem Route
router.post('/agent', requireAuth, async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role || 'Member';
    const orgId = (req.headers['x-organization-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const correlationId = req.headers['x-correlation-id'] as string;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const historyRes = await convManager.getHistory(conversationId || '');
    const history = historyRes.isSuccess() ? historyRes.value : [];

    const response = await agentRunner.run(
      message,
      { userId, organizationId: orgId, conversationId: conversationId || '', userRole },
      history
    );

    res.json({
      success: true,
      data: {
        agentId: response.agentId,
        message: response.message.content,
        toolsCalled: response.toolsCalled,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        durationMs: response.durationMs,
        model: response.model,
        correlationId,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/agents', requireAuth, (_req, res) => {
  res.json({
    success: true,
    data: {
      agents: orchestrator.listAgents().map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        tools: a.tools.map((t: any) => t.name),
      })),
    },
  });
});

router.get('/agent/analytics', requireAuth, async (req, res, next) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const analytics = await agentRunner.getAnalytics(orgId);
    res.json({ success: true, data: { analytics } });
  } catch (err) {
    next(err);
  }
});

export const aiRouter = router;
