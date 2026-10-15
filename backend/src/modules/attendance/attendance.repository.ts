import { supabase as defaultSupabase } from '@database/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { AttendanceRecord, TodayAttendanceOverview, TodayAttendanceItem } from './attendance.types';

export class AttendanceRepository {
  constructor(private readonly supabase: SupabaseClient = defaultSupabase) {}

  async createCheckIn(record: {
    organization_id: string;
    user_id: string;
    location_id?: string;
    check_in_time: string;
    status: 'active' | 'completed';
  }): Promise<AttendanceRecord | null> {
    const { data, error } = await this.supabase
      .from('attendance_logs')
      .insert([record])
      .select()
      .single();

    if (error || !data) return null;
    return data as AttendanceRecord;
  }

  async findActiveCheckIn(orgId: string, userId: string): Promise<AttendanceRecord | null> {
    const { data, error } = await this.supabase
      .from('attendance_logs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as AttendanceRecord;
  }

  async findById(orgId: string, attendanceId: string): Promise<AttendanceRecord | null> {
    const { data, error } = await this.supabase
      .from('attendance_logs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', attendanceId)
      .maybeSingle();

    if (error || !data) return null;
    return data as AttendanceRecord;
  }

  async checkOut(attendanceId: string, checkOutTime: string, durationMinutes?: number): Promise<AttendanceRecord | null> {
    const { data, error } = await this.supabase
      .from('attendance_logs')
      .update({
        status: 'completed',
        check_out_time: checkOutTime,
        duration_minutes: durationMinutes,
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error || !data) return null;
    return data as AttendanceRecord;
  }

  async getTodayOverview(orgId: string): Promise<TodayAttendanceOverview> {
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

    const { data: logs, error } = await this.supabase
      .from('attendance_logs')
      .select('*, location:organization_locations(name)')
      .eq('organization_id', orgId)
      .gte('check_in_time', todayStart)
      .order('check_in_time', { ascending: false });

    if (error || !logs || logs.length === 0) {
      return {
        totalCheckInsToday: 0,
        currentlyInsideCount: 0,
        activeSessions: [],
        recentActivity: [],
      };
    }

    const userIds = Array.from(new Set(logs.map((l: any) => l.user_id)));

    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        profiles.forEach((p: any) => profileMap.set(p.id, p));
      }
    }

    const mappedItems: TodayAttendanceItem[] = logs.map((log: any) => {
      const profile = profileMap.get(log.user_id);
      return {
        id: log.id,
        userId: log.user_id,
        name: profile?.full_name || 'Member',
        email: profile?.email || '',
        avatarUrl: profile?.avatar_url || null,
        checkInTime: log.check_in_time,
        checkOutTime: log.check_out_time || null,
        status: log.status,
        durationMinutes: log.duration_minutes ?? null,
        locationId: log.location_id || null,
        locationName: log.location?.name || null,
      };
    });

    const activeSessions = mappedItems.filter((i) => i.status === 'active');
    const recentActivity = mappedItems.slice(0, 30);

    return {
      totalCheckInsToday: logs.length,
      currentlyInsideCount: activeSessions.length,
      activeSessions,
      recentActivity,
    };
  }

  async getOrganizationHistory(orgId: string, limit = 50): Promise<TodayAttendanceItem[]> {
    const { data: logs, error } = await this.supabase
      .from('attendance_logs')
      .select('*, location:organization_locations(name)')
      .eq('organization_id', orgId)
      .order('check_in_time', { ascending: false })
      .limit(limit);

    if (error || !logs || logs.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(logs.map((l: any) => l.user_id)));
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        profiles.forEach((p: any) => profileMap.set(p.id, p));
      }
    }

    return logs.map((log: any) => {
      const profile = profileMap.get(log.user_id);
      return {
        id: log.id,
        userId: log.user_id,
        name: profile?.full_name || 'Member',
        email: profile?.email || '',
        avatarUrl: profile?.avatar_url || null,
        checkInTime: log.check_in_time,
        checkOutTime: log.check_out_time || null,
        status: log.status,
        durationMinutes: log.duration_minutes ?? null,
        locationId: log.location_id || null,
        locationName: log.location?.name || null,
      };
    });
  }

  async getHistory(orgId: string, userId: string, limit = 50): Promise<AttendanceRecord[]> {
    const { data, error } = await this.supabase
      .from('attendance_logs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .order('check_in_time', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as AttendanceRecord[];
  }

  async isUserInOrg(orgId: string, userId: string): Promise<boolean> {
    const { data: member } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (member) return true;

    // Check profiles.organization_id fallback
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('id', userId)
      .single();

    return !!profile;
  }

  async searchMembers(orgId: string, query: string, limit = 10): Promise<{ id: string; userId: string; name: string; email: string; avatarUrl: string | null; status: string }[]> {
    const { data: members, error } = await this.supabase
      .from('organization_members')
      .select('id, user_id, status, role')
      .eq('organization_id', orgId)
      .limit(limit * 2);

    if (error || !members || members.length === 0) return [];

    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    const q = query.toLowerCase();
    const results: any[] = [];

    for (const m of members) {
      const p = profileMap.get(m.user_id);
      const name = p?.full_name || 'Member';
      const email = p?.email || '';

      if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
        results.push({
          id: m.id,
          userId: m.user_id,
          name,
          email,
          avatarUrl: p?.avatar_url || null,
          status: m.status || 'active',
        });
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}
