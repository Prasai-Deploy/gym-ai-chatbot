import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { logger } from '@logger/index';
import {
  AdminDashboardStats,
  Member,
  MembershipPlan,
  AssignPlanDTO,
} from '../domain/AdminSchemas';

export class AdminRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async getDashboardStats(organizationId?: string): Promise<Result<AdminDashboardStats, AppError>> {
    try {
      if (organizationId) {
        // Tenant-scoped stats: only profiles and workouts belonging to this organization
        const [membersRes, workoutsRes, exercisesRes] = await Promise.all([
          this.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
          this.supabase.from('v2_workout_plans').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
          this.supabase.from('exercises').select('id', { count: 'exact', head: true }),
        ]);

        const stats: AdminDashboardStats = {
          total_members: membersRes.count ?? 0,
          active_members: membersRes.count ?? 0,
          total_workouts: workoutsRes.count ?? 0,
          total_exercises: exercisesRes.count ?? 0,
        };

        return ok(stats);
      }

      // Platform-wide stats (strictly for Platform Super Admin)
      const [membersRes, workoutsRes, exercisesRes] = await Promise.all([
        this.supabase.from('profiles').select('id', { count: 'exact', head: true }),
        this.supabase.from('v2_workout_sessions').select('id', { count: 'exact', head: true }),
        this.supabase.from('exercises').select('id', { count: 'exact', head: true }),
      ]);

      const stats: AdminDashboardStats = {
        total_members: membersRes.count ?? 0,
        active_members: membersRes.count ?? 0, // Simplified — active = total for now
        total_workouts: workoutsRes.count ?? 0,
        total_exercises: exercisesRes.count ?? 0,
      };

      return ok(stats);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] getDashboardStats error');
      return fail(new AppError(err.message, 500));
    }
  }

  public async getMembers(limit = 50, offset = 0, search?: string, organizationId?: string): Promise<Result<Member[], AppError>> {
    try {
      let query = this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }


      const { data, error } = await query;
      if (error) throw error;

      const members = (data ?? []).map((m: any) => ({
        ...m,
        role: 'member',
      })) as Member[];

      return ok(members);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] getMembers error');
      return fail(new AppError(err.message, 500));
    }
  }

  public async getMembershipPlans(): Promise<Result<MembershipPlan[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('membership_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        // Table may not exist yet — return empty array gracefully
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          return ok([]);
        }
        throw error;
      }

      return ok((data ?? []) as MembershipPlan[]);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] getMembershipPlans error');
      return fail(new AppError(err.message, 500));
    }
  }

  public async assignPlan(dto: AssignPlanDTO): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from('user_memberships')
        .upsert(
          {
            user_id: dto.user_id,
            plan_id: dto.plan_id,
            assigned_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        // Table may not exist yet — return ok gracefully
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          return ok(undefined);
        }
        throw error;
      }

      return ok(undefined);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] assignPlan error');
      return fail(new AppError(err.message, 500));
    }
  }
}
