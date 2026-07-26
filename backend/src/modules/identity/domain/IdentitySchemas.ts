import { z } from 'zod';

// Base Profile Schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  timezone: z.string().default('UTC'),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const UpdateProfileSchema = ProfileSchema.omit({ id: true, email: true }).partial();
export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;

// Fitness Profile Schema
export const FitnessLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'elite']);
export const FitnessProfileSchema = z.object({
  id: z.string().uuid(),
  level: FitnessLevelSchema.default('beginner'),
  height_cm: z.number().positive().nullable(),
  target_weight_kg: z.number().positive().nullable(),
  primary_goal: z.string().nullable(),
  medical_conditions: z.array(z.string()).default([]),
});
export type FitnessProfile = z.infer<typeof FitnessProfileSchema>;

export const UpdateFitnessProfileSchema = FitnessProfileSchema.omit({ id: true }).partial();
export type UpdateFitnessProfileDTO = z.infer<typeof UpdateFitnessProfileSchema>;

// Preferences Schema
export const PreferredUnitSchema = z.enum(['metric', 'imperial']);
export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  unit_system: PreferredUnitSchema.default('metric'),
  push_notifications_enabled: z.boolean().default(true),
  email_notifications_enabled: z.boolean().default(true),
  weekly_reports_enabled: z.boolean().default(true),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdatePreferencesSchema = UserPreferencesSchema.omit({ id: true }).partial();
export type UpdatePreferencesDTO = z.infer<typeof UpdatePreferencesSchema>;

// Member Settings Schema
export const MemberSettingsSchema = z.object({
  id: z.string().uuid(),
  theme: z.string().default('system'),
  start_of_week: z.number().min(0).max(6).default(1),
});
export type MemberSettings = z.infer<typeof MemberSettingsSchema>;

export const UpdateMemberSettingsSchema = MemberSettingsSchema.omit({ id: true }).partial();
export type UpdateMemberSettingsDTO = z.infer<typeof UpdateMemberSettingsSchema>;
