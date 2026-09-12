import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { logger } from '@logger/index';
import { AdminDashboardStats, Member, MembershipPlan, AssignPlanDTO } from '../domain/AdminSchemas';

export class AdminRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async getDashboardStats(
    organizationId: string,
  ): Promise<Result<AdminDashboardStats, AppError>> {
    try {
      const [membersRes, memberIdsRes, exercisesRes] = await Promise.all([
        this.supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        this.supabase.from('profiles').select('id').eq('organization_id', organizationId),
        this.supabase.from('exercises').select('id', { count: 'exact', head: true }),
      ]);
      const memberIds = (memberIdsRes.data ?? []).map((member: any) => member.id);
      const workoutsRes = memberIds.length
        ? await this.supabase
            .from('workout_sessions')
            .select('id', { count: 'exact', head: true })
            .in('user_id', memberIds)
        : { count: 0 };

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

  public async getMembers(
    organizationId: string,
    limit = 50,
    offset = 0,
    search?: string,
  ): Promise<Result<Member[], AppError>> {
    try {
      let query = this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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

  public async getMembershipPlans(
    organizationId: string,
  ): Promise<Result<MembershipPlan[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      return ok((data ?? []) as MembershipPlan[]);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] getMembershipPlans error');
      return fail(new AppError(err.message, 500));
    }
  }

  public async assignPlan(
    organizationId: string,
    dto: AssignPlanDTO,
  ): Promise<Result<void, AppError>> {
    try {
      const { data: member, error: memberError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', dto.user_id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member) return fail(new AppError('Member does not belong to this organization', 403));

      const { error } = await this.supabase.from('user_memberships').upsert(
        {
          organization_id: organizationId,
          user_id: dto.user_id,
          plan_id: dto.plan_id,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        throw error;
      }

      return ok(undefined);
    } catch (err: any) {
      logger.error({ err }, '[AdminRepository] assignPlan error');
      return fail(new AppError(err.message, 500));
    }
  }
}
