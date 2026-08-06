import { AgentDefinition, AgentTool, AgentContext } from './agent.types';

// ─────────────────────────────────────────────────────────────
// Shared tool factory helpers
// ─────────────────────────────────────────────────────────────
const logWorkoutSetTool: AgentTool = {
  name: 'log_workout_set',
  description: 'Logs a completed exercise set for the current member.',
  parameters: { exerciseId: 'string', weightKg: 'number', reps: 'number', rpe: 'number' },
  execute: async (args, _ctx: AgentContext) => ({ logged: true, ...args }),
};

const getMacroProgressTool: AgentTool = {
  name: 'get_macro_progress',
  description: 'Retrieves today\'s macro (protein, carbs, fat) and calorie progress.',
  parameters: { date: 'string?' },
  execute: async (_args, _ctx: AgentContext) => ({
    calories: { target: 2650, consumed: 1940 },
    protein: { target: 180, consumed: 142 },
    carbs: { target: 220, consumed: 168 },
    fats: { target: 65, consumed: 48 },
  }),
};

const getRecoveryScoreTool: AgentTool = {
  name: 'get_recovery_score',
  description: 'Retrieves the member\'s current recovery readiness score (0–100).',
  parameters: {},
  execute: async (_args, _ctx: AgentContext) => ({ score: 84, label: 'Well Recovered', hrv: 52 }),
};

const getBusinessKpiTool: AgentTool = {
  name: 'get_business_kpi',
  description: 'Retrieves gym KPIs: MRR, active members, attendance, and churn rate.',
  parameters: {},
  execute: async (_args, _ctx: AgentContext) => ({
    mrr: 48250, activeMembers: 1240, todayAttendance: 680, churnRiskCount: 14,
  }),
};

const getClientRosterTool: AgentTool = {
  name: 'get_client_roster',
  description: 'Retrieves the trainer\'s assigned client list with health scores.',
  parameters: {},
  execute: async (_args, _ctx: AgentContext) => ({
    clients: [
      { name: 'Marcus R.', healthScore: 91, lastSession: '2 days ago', status: 'on_track' },
      { name: 'Priya S.', healthScore: 72, lastSession: '5 days ago', status: 'needs_attention' },
    ],
  }),
};

const createSupportTicketTool: AgentTool = {
  name: 'create_support_ticket',
  description: 'Creates a support ticket for a member issue.',
  parameters: { subject: 'string', description: 'string', priority: 'string?' },
  execute: async (args, ctx: AgentContext) => ({
    ticketId: `TICK-${Date.now()}`,
    userId: ctx.userId,
    ...args,
    status: 'open',
  }),
};

// ─────────────────────────────────────────────────────────────
// Agent Definitions Registry
// ─────────────────────────────────────────────────────────────
export const AGENT_DEFINITIONS: Record<string, AgentDefinition> = {
  fitness_coach: {
    id: 'fitness_coach',
    name: 'Coach Trinity',
    description: 'Specializes in workout programming, exercise technique, progressive overload, and training periodization.',
    systemPrompt: `You are Coach Trinity, an elite AI personal trainer and strength & conditioning specialist for STRIVA.
Your expertise covers hypertrophy, strength, HIIT, mobility, and recovery-informed training periodization.
Always provide specific, science-backed, practical advice. Be motivating, direct, and precision-focused.
When the user asks about workouts, always reference their current training plan and performance data.`,
    tools: [logWorkoutSetTool, getRecoveryScoreTool],
    triggerKeywords: ['workout', 'exercise', 'training', 'lift', 'sets', 'reps', 'push', 'pull', 'legs', 'cardio', 'strength', 'bench', 'squat', 'deadlift'],
  },

  nutrition: {
    id: 'nutrition',
    name: 'NutriAI',
    description: 'Specializes in nutrition planning, macro optimization, meal timing, and supplement guidance.',
    systemPrompt: `You are NutriAI, a certified sports nutritionist and metabolic health specialist for STRIVA.
Your expertise covers macronutrient optimization, nutrient timing, gut health, supplementation, and body recomposition nutrition.
Provide precise, evidence-based nutritional guidance tailored to the member's fitness goals and body metrics.
Always reference the member's current macro targets and daily progress when giving advice.`,
    tools: [getMacroProgressTool],
    triggerKeywords: ['eat', 'food', 'meal', 'nutrition', 'protein', 'calories', 'diet', 'macro', 'carbs', 'fat', 'supplement', 'water', 'hydration'],
  },

  recovery: {
    id: 'recovery',
    name: 'RecoveryOS',
    description: 'Specializes in sleep optimization, HRV monitoring, active recovery, and injury prevention.',
    systemPrompt: `You are RecoveryOS, an AI recovery specialist for STRIVA.
Your expertise covers sleep science, heart rate variability, active recovery protocols, fascia health, and injury prevention.
Assess the member's recovery readiness score, HRV trends, and stress markers to make precise recovery recommendations.
Help members understand when to push hard and when strategic rest is the optimal performance decision.`,
    tools: [getRecoveryScoreTool],
    triggerKeywords: ['recovery', 'sleep', 'rest', 'sore', 'tired', 'fatigue', 'hrv', 'stress', 'injury', 'pain', 'foam roll', 'stretch'],
  },

  trainer_copilot: {
    id: 'trainer_copilot',
    name: 'Trainer Copilot',
    description: 'Assists personal trainers with client management, workout programming, and progress analysis.',
    systemPrompt: `You are Trainer Copilot, an AI assistant designed exclusively for personal trainers on the STRIVA platform.
Help trainers review client progress, flag members needing attention, suggest program modifications, and draft professional coaching notes.
Provide data-driven insights with specific client metrics to help trainers deliver superior coaching at scale.`,
    tools: [getClientRosterTool, getRecoveryScoreTool],
    triggerKeywords: ['client', 'member', 'program', 'progress', 'assign', 'note', 'trainer', 'copilot', 'roster'],
  },

  business_advisor: {
    id: 'business_advisor',
    name: 'Business Advisor',
    description: 'Assists gym owners and managers with business intelligence, revenue insights, and operational recommendations.',
    systemPrompt: `You are Business Advisor, an AI operations and revenue intelligence specialist for STRIVA gym owners.
Analyze gym KPIs, revenue trends, membership churn risk, attendance patterns, and trainer performance.
Provide actionable strategic recommendations to grow membership, reduce churn, optimize pricing, and improve operational efficiency.`,
    tools: [getBusinessKpiTool],
    triggerKeywords: ['revenue', 'mrr', 'members', 'attendance', 'business', 'churn', 'renewal', 'plan', 'pricing', 'marketing', 'growth', 'kpi'],
  },

  support: {
    id: 'support',
    name: 'STRIVA Support',
    description: 'Handles general platform questions, troubleshooting, and escalates unresolved issues as support tickets.',
    systemPrompt: `You are STRIVA Support, a friendly and knowledgeable customer success agent for the STRIVA platform.
Help members, trainers, and gym owners resolve platform questions, billing queries, account settings, and technical issues.
Be empathetic, clear, and solution-focused. If the issue cannot be resolved immediately, create a support ticket.`,
    tools: [createSupportTicketTool],
    triggerKeywords: ['help', 'support', 'issue', 'bug', 'problem', 'cancel', 'refund', 'account', 'login', 'reset', 'password'],
  },
};
