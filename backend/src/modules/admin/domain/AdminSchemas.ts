import { z } from 'zod';

// ── Admin Dashboard ────────────────────────────────────────────────────────────
export const AdminDashboardSchema = z.object({
  total_members: z.number(),
  active_members: z.number(),
  total_workouts: z.number(),
  total_exercises: z.number(),
});
export type AdminDashboardStats = z.infer<typeof AdminDashboardSchema>;

// ── Member ─────────────────────────────────────────────────────────────────────
export const MemberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  role: z.string().default('member'),
});
export type Member = z.infer<typeof MemberSchema>;

// ── Membership Plan ────────────────────────────────────────────────────────────
export const MembershipPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  duration_days: z.number(),
  price: z.number(),
  created_at: z.string(),
});
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>;

export const AssignPlanSchema = z.object({
  user_id: z.string().uuid(),
  plan_id: z.string().uuid(),
});
export type AssignPlanDTO = z.infer<typeof AssignPlanSchema>;
