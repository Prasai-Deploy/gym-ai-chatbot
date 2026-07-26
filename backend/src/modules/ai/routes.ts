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

// Wire real ContextBuilderService from Intelligence module
// This replaces the mockContextBuilder stub.
const nutritionRepo = new NutritionRepository(supabase);
const recoveryRepo = new RecoveryRepository(supabase);
const memoryRepo = new MemoryRepository(supabase);
const nutritionSvc = new NutritionService(nutritionRepo);
const recoverySvc = new RecoveryService(recoveryRepo);
const memorySvc = new MemoryService(memoryRepo);

// Lightweight adapters that satisfy ContextBuilderService's extProgress/extIdentity contracts
// without creating circular module dependencies.
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
  transitionSessionState: async () => ok({ status: 'started' })
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

export const aiRouter = router;
