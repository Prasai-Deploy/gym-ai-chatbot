import { Router } from 'express';
import { AIController } from './controllers/AIController';
import { GroqProvider } from './providers/GroqProvider';
import { ConversationManager } from './core/ConversationManager';
import { PromptBuilder } from './core/PromptBuilder';
import { ToolRuntime } from './core/ToolRuntime';
import { SafetyGuard } from './safety/SafetyGuard';
import { toolRegistry } from './tools/ToolRegistry';
import { LogWorkoutTool } from './tools/impl/LogWorkoutTool';
import { supabase } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { Result, ok } from '@shared/core/Result';

const router = Router();

// DI Wiring
const provider = new GroqProvider('dummy-key');
const convManager = new ConversationManager(supabase);
const promptBuilder = new PromptBuilder();
const toolRuntime = new ToolRuntime(toolRegistry);
const safetyGuard = new SafetyGuard();

// Mock dependencies for tools and context
const mockWorkoutSvc = {
  transitionSessionState: async () => ok({ status: 'started' })
};
const mockContextBuilder = {
  buildUnifiedContext: async () => ({
    isSuccess: true,
    value: { identity: { memberId: '123' }, workout: {}, progress: {}, nutrition: {}, recovery: {}, memory: {} }
  })
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
  mockContextBuilder as any
);

// -- ROUTES --
router.post('/chat', requireAuth, controller.chat);

export const aiRouter = router;
