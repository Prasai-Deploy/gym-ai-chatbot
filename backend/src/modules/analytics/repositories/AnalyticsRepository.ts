import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@database/supabase';
import { DateRange } from '../analytics.types';
import { logger } from '@logger/index';

export class AnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient = supabaseAdmin) {}

  /**
   * Retrieves all member IDs belonging to an organization.
   */
  public async getOrgMemberIds(organizationId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId);

      if (error) {
        logger.error({ err: error.message, organizationId }, '[AnalyticsRepository] getOrgMemberIds error');
        return [];
      }

      return (data || []).map((row: any) => row.id);
    } catch (err: any) {
      logger.error({ err: err.message, organizationId }, '[AnalyticsRepository] getOrgMemberIds error');
      return [];
    }
  }

  /**
   * Fetches real member profiles for an organization.
   */
  public async getOrgMembers(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        logger.error({ err: error.message, organizationId }, '[AnalyticsRepository] getOrgMembers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message, organizationId }, '[AnalyticsRepository] getOrgMembers exception');
      return [];
    }
  }

  /**
   * Fetches real subscriptions for organization members.
   */
  public async getSubscriptionsForUsers(userIds: string[]): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', userIds);

      if (error) {
        logger.error({ err: error.message }, '[AnalyticsRepository] getSubscriptionsForUsers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getSubscriptionsForUsers exception');
      return [];
    }
  }

  /**
   * Fetches real invoices for organization members within date range.
   */
  public async getInvoicesForUsers(userIds: string[], period: DateRange): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .in('user_id', userIds)
        .gte('created_at', period.from)
        .lte('created_at', period.to + 'T23:59:59.999Z');

      if (error) {
        logger.error({ err: error.message }, '[AnalyticsRepository] getInvoicesForUsers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getInvoicesForUsers exception');
      return [];
    }
  }

  /**
   * Fetches attendance / checkin logs for an organization.
   */
  public async getAttendanceLogs(organizationId: string, period: DateRange): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('attendance_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('check_in_time', period.from)
        .lte('check_in_time', period.to + 'T23:59:59.999Z');

      if (error) {
        logger.warn({ err: error.message, organizationId }, '[AnalyticsRepository] attendance_logs query failed');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message, organizationId }, '[AnalyticsRepository] getAttendanceLogs exception');
      return [];
    }
  }

  /**
   * Fetches workout sessions for organization members within date range.
   */
  public async getWorkoutSessionsForUsers(userIds: string[], period: DateRange): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('v2_workout_sessions')
        .select('*')
        .in('user_id', userIds)
        .gte('created_at', period.from)
        .lte('created_at', period.to + 'T23:59:59.999Z');

      if (error) {
        logger.error({ err: error.message }, '[AnalyticsRepository] getWorkoutSessionsForUsers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getWorkoutSessionsForUsers exception');
      return [];
    }
  }

  /**
   * Fetches exercise sets for given session IDs.
   */
  public async getExerciseSetsForSessions(sessionIds: string[]): Promise<any[]> {
    if (!sessionIds || sessionIds.length === 0) return [];

    try {
      const { data: sets, error: setsErr } = await this.supabase
        .from('exercise_sets')
        .select('*')
        .in('session_id', sessionIds);

      if (setsErr) {
        logger.error({ err: setsErr.message }, '[AnalyticsRepository] getExerciseSetsForSessions error');
        return [];
      }

      return sets || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getExerciseSetsForSessions exception');
      return [];
    }
  }

  /**
   * Fetches exercise definitions.
   */
  public async getExercises(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.from('exercises').select('id, name');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetches nutrition logs for organization members within date range.
   */
  public async getNutritionLogsForUsers(userIds: string[], period: DateRange): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('v2_nutrition_logs')
        .select('*')
        .in('user_id', userIds)
        .gte('date', period.from)
        .lte('date', period.to);

      if (error) {
        logger.error({ err: error.message }, '[AnalyticsRepository] getNutritionLogsForUsers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getNutritionLogsForUsers exception');
      return [];
    }
  }

  /**
   * Fetches recovery logs for organization members within date range.
   */
  public async getRecoveryLogsForUsers(userIds: string[], period: DateRange): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('recovery_logs')
        .select('*')
        .in('user_id', userIds)
        .gte('date', period.from)
        .lte('date', period.to);

      if (error) {
        logger.error({ err: error.message }, '[AnalyticsRepository] getRecoveryLogsForUsers error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[AnalyticsRepository] getRecoveryLogsForUsers exception');
      return [];
    }
  }

  /**
   * Fetches staff list for an organization.
   */
  public async getOrganizationStaff(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        logger.error({ err: error.message, organizationId }, '[AnalyticsRepository] getOrganizationStaff error');
        return [];
      }

      return data || [];
    } catch (err: any) {
      logger.error({ err: err.message, organizationId }, '[AnalyticsRepository] getOrganizationStaff exception');
      return [];
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();
