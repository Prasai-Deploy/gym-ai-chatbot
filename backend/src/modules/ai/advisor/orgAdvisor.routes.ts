import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';
import { OrgAdvisorController } from './orgAdvisor.controller';
import { AgentRunner } from '../agents/AgentRunner';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GroqProvider } from '../providers/GroqProvider';
import { ConversationManager } from '../core/ConversationManager';
import { B2BContextBuilder } from '../core/B2BContextBuilder';
import { memoryEngine } from '../agents/MemoryEngine';
import { aiUsageRepository } from '../repositories/AIUsageRepository';
import { OrganizationRepository } from '../../organization/organization.repository';
import { OwnerAnalyticsService } from '../../analytics/ownerAnalytics.service';
import { AttendanceRepository } from '../../attendance/attendance.repository';
import { TrainerRepository } from '../../trainer/trainer.repository';
import { NotificationService } from '../../notification/notification.service';
import { notificationRepository } from '../../notification/notification.repository';
import { OrgBillingService } from '../../billing/organization/orgBilling.service';
import { orgBillingRepository } from '../../billing/organization/orgBilling.repository';
import {
  GetOrganizationOverviewTool,
  GetMemberSummaryTool,
  GetAttendanceSummaryTool,
  GetTrainerAssignmentsTool,
  GetRetentionSummaryTool,
  GetAttentionItemsTool,
  GetOrganizationBillingStatusTool,
} from '../tools/impl/B2BTrinetraTools';
import { supabase } from '@database/supabase';
import { env } from '@config/env';

const router = Router();

// 1. Domain Service Instantiations
const orgRepo = new OrganizationRepository(supabase);
const ownerAnalyticsSvc = new OwnerAnalyticsService(supabase);
const attendanceRepo = new AttendanceRepository(supabase);
const trainerRepo = new TrainerRepository(supabase);
const notificationSvc = new NotificationService(notificationRepository);
const orgBillingSvc = new OrgBillingService(orgBillingRepository);

// 2. Dedicated B2B Tool Registry (Isolated from Consumer TRINETRA Tools)
export const b2bToolRegistry = new ToolRegistry();
b2bToolRegistry.register(new GetOrganizationOverviewTool(orgRepo));
b2bToolRegistry.register(new GetMemberSummaryTool(ownerAnalyticsSvc));
b2bToolRegistry.register(new GetAttendanceSummaryTool(ownerAnalyticsSvc, attendanceRepo));
b2bToolRegistry.register(new GetTrainerAssignmentsTool(ownerAnalyticsSvc));
b2bToolRegistry.register(new GetRetentionSummaryTool(ownerAnalyticsSvc));
b2bToolRegistry.register(new GetAttentionItemsTool(notificationSvc));
b2bToolRegistry.register(new GetOrganizationBillingStatusTool(orgBillingSvc));

// 3. Runtime & Advisor Wiring
const b2bContextBuilder = new B2BContextBuilder(orgRepo);
const provider = new GroqProvider(
  env.GROQ_API_KEY ?? '',
  env.GROQ_PRIMARY_MODEL,
  env.GROQ_FALLBACK_MODEL
);
const b2bAgentRunner = new AgentRunner(
  provider,
  memoryEngine,
  aiUsageRepository,
  undefined, // contextBuilder for consumer is left undefined for B2B runner
  b2bToolRegistry,
  b2bContextBuilder
);
const convManager = new ConversationManager(supabase);

const controller = new OrgAdvisorController(b2bAgentRunner, convManager);

// 4. Strict RBAC & Tenant Verification Middleware Pipeline
// Authorized roles: Platform Super Admin, Organization Owner, Gym Manager.
// Denied roles: Trainer, Front Desk, Nutritionist, Member, Demo User.
const advisorAuthPipeline = [
  requireAuth,
  tenantMiddleware,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
];

router.post('/chat', ...advisorAuthPipeline, controller.chat);
router.get('/conversations', ...advisorAuthPipeline, controller.listConversations);
router.get('/conversations/:id/messages', ...advisorAuthPipeline, controller.getHistory);
router.patch('/conversations/:id', ...advisorAuthPipeline, controller.renameConversation);
router.delete('/conversations/:id', ...advisorAuthPipeline, controller.deleteConversation);
router.get('/analytics', ...advisorAuthPipeline, controller.getAnalytics);

export const orgAdvisorRouter = router;
