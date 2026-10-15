import { Router } from 'express';
import { AIController } from './controllers/AIController';
import { GroqProvider } from './providers/GroqProvider';
import { ConversationManager } from './core/ConversationManager';
import { ContextBuilder } from './core/ContextBuilder';
import { AgentRunner } from './agents/AgentRunner';
import { memoryEngine } from './agents/MemoryEngine';
import { aiUsageRepository } from './repositories/AIUsageRepository';
import { toolRegistry } from './tools/ToolRegistry';
import {
  GetProfileTool,
  GetGoalsTool,
  GetTodayWorkoutTool,
  GetProgressTool,
  GetNutritionTool,
  GetRecoveryTool,
  CreateWorkoutTool,
  ModifyWorkoutTool,
  LogWorkoutToolImpl,
  LogMealTool,
  LogWaterTool,
  UpdateGoalTool,
} from './tools/impl/TrinetraTools';
import { IdentityService } from '../identity/services/IdentityService';
import { IdentityRepository } from '../identity/repositories/IdentityRepository';
import { WorkoutExecutionService } from '../workout/services/WorkoutExecutionService';
import { V2WorkoutSessionRepository } from '../workout/repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository } from '../workout/repositories/WorkoutPlanRepository';
import { NutritionService } from '../nutrition/services/NutritionService';
import { NutritionRepository } from '../nutrition/repositories/NutritionRepository';
import { ProgressAnalyticsService } from '../progress/services/ProgressAnalyticsService';
import { ProgressRepository } from '../progress/repositories/ProgressRepository';
import { supabase, supabaseAdmin } from '@database/supabase';
import { requireAuth } from '@middleware/auth';
import { requireActiveEntitlement } from '@middleware/entitlement.middleware';
import { env } from '@config/env';

const router = Router();

// Domain Service Instantiations (Using supabaseAdmin for backend AI context & tool execution)
const identityRepo = new IdentityRepository(supabaseAdmin);
const identitySvc = new IdentityService(identityRepo);

const workoutSessionRepo = new V2WorkoutSessionRepository(supabaseAdmin);
const workoutPlanRepo = new WorkoutPlanRepository(supabaseAdmin);
const workoutSvc = new WorkoutExecutionService(workoutSessionRepo, workoutPlanRepo);

const nutritionRepo = new NutritionRepository(supabaseAdmin);
const nutritionSvc = new NutritionService(nutritionRepo);

const progressRepo = new ProgressRepository(supabaseAdmin);
const progressSvc = new ProgressAnalyticsService(progressRepo);

// Register 12 Canonical TRINETRA Tools
toolRegistry.clear();
toolRegistry.register(new GetProfileTool(identitySvc));
toolRegistry.register(new GetGoalsTool(supabaseAdmin));
toolRegistry.register(new GetTodayWorkoutTool(workoutSvc));
toolRegistry.register(new GetProgressTool(progressSvc));
toolRegistry.register(new GetNutritionTool(nutritionSvc));
toolRegistry.register(new GetRecoveryTool(supabaseAdmin));
toolRegistry.register(new CreateWorkoutTool(workoutSvc));
toolRegistry.register(new ModifyWorkoutTool(workoutSvc));
toolRegistry.register(new LogWorkoutToolImpl(workoutSvc));
toolRegistry.register(new LogMealTool(nutritionSvc));
toolRegistry.register(new LogWaterTool(nutritionSvc));
toolRegistry.register(new UpdateGoalTool(supabaseAdmin));

// Context & Provider Wiring
const contextBuilder = new ContextBuilder(supabaseAdmin, identitySvc, workoutSvc, nutritionSvc, progressSvc);
const provider = new GroqProvider(
  env.GROQ_API_KEY ?? '',
  env.GROQ_PRIMARY_MODEL,
  env.GROQ_FALLBACK_MODEL
);
const agentRunner = new AgentRunner(provider, memoryEngine, aiUsageRepository, contextBuilder);
const convManager = new ConversationManager(supabaseAdmin);

const controller = new AIController(agentRunner, convManager);

// -- CHAT & STREAMING ROUTE --
router.post('/chat', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.chat);
router.post('/agent', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.chat);

// -- CONVERSATION MANAGEMENT ROUTES --
router.get('/conversations', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.listConversations);
router.get('/conversations/:id/messages', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.getHistory);
router.patch('/conversations/:id', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.renameConversation);
router.delete('/conversations/:id', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), controller.deleteConversation);

// -- ANALYTICS ROUTES --
router.get('/user/analytics', requireAuth, controller.getUserAnalytics);
router.get('/agent/analytics', requireAuth, requireActiveEntitlement({ feature: 'trinetra' }), async (req, res, next) => {
  try {
    const orgId = req.organizationContext?.organizationId || '';
    const analytics = await agentRunner.getAnalytics(orgId);
    res.json({ success: true, data: { analytics } });
  } catch (err) {
    next(err);
  }
});

export const aiRouter = router;
