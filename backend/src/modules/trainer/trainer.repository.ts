import { supabase as defaultSupabase } from '@database/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  TrainerListItem,
  TrainerDetailView,
  TrainerAssignedMember,
  TrainerMemberAssignmentRecord,
} from './trainer.types';

export class TrainerRepository {
  constructor(private readonly supabase: SupabaseClient = defaultSupabase) {}

  /**
   * Retrieves all trainers for an organization with their active assigned member counts
   */
  async getTrainers(orgId: string, search?: string): Promise<TrainerListItem[]> {
    let query = this.supabase
      .from('organization_members')
      .select('id, user_id, organization_id, role, status, created_at, location_id, location:organization_locations(name)')
      .eq('organization_id', orgId)
      .eq('role', 'Trainer');

    const { data: members, error } = await query;
    if (error || !members || members.length === 0) return [];

    const userIds = members.map((m: any) => m.user_id);

    // Fetch trainer profile info
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    // Fetch active assignments count per trainer
    const { data: assignments } = await this.supabase
      .from('trainer_member_assignments')
      .select('trainer_user_id')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    const countMap = new Map<string, number>();
    if (assignments) {
      assignments.forEach((a: any) => {
        countMap.set(a.trainer_user_id, (countMap.get(a.trainer_user_id) || 0) + 1);
      });
    }

    const q = (search || '').trim().toLowerCase();

    const list: TrainerListItem[] = [];
    for (const m of members) {
      const profile = profileMap.get(m.user_id);
      const name = profile?.full_name || 'Personal Trainer';
      const email = profile?.email || '';

      if (q && !name.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) {
        continue;
      }

      list.push({
        id: m.id,
        userId: m.user_id,
        name,
        email,
        avatarUrl: profile?.avatar_url || null,
        role: m.role,
        status: m.status || 'active',
        joinedAt: m.created_at,
        assignedMemberCount: countMap.get(m.user_id) || 0,
        locationId: m.location_id || null,
        locationName: (m as any).location?.name || null,
      });
    }

    return list;
  }

  /**
   * Retrieves single trainer details along with assigned active members
   */
  async getTrainerDetail(orgId: string, trainerUserId: string): Promise<TrainerDetailView | null> {
    const { data: member, error } = await this.supabase
      .from('organization_members')
      .select('id, user_id, organization_id, role, status, created_at, location_id, location:organization_locations(name)')
      .eq('organization_id', orgId)
      .eq('user_id', trainerUserId)
      .eq('role', 'Trainer')
      .single();

    if (error || !member) return null;

    // Fetch trainer profile
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', trainerUserId)
      .single();

    // Fetch active assigned members for this trainer
    const { data: assignments } = await this.supabase
      .from('trainer_member_assignments')
      .select('id, member_user_id, status, assigned_at')
      .eq('organization_id', orgId)
      .eq('trainer_user_id', trainerUserId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });

    const assignedMembers: TrainerAssignedMember[] = [];

    if (assignments && assignments.length > 0) {
      const memberUserIds = assignments.map((a: any) => a.member_user_id);
      const { data: memberProfiles } = await this.supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', memberUserIds);

      const memberProfileMap = new Map<string, any>();
      if (memberProfiles) {
        memberProfiles.forEach((mp: any) => memberProfileMap.set(mp.id, mp));
      }

      for (const a of assignments) {
        const mp = memberProfileMap.get(a.member_user_id);
        assignedMembers.push({
          assignmentId: a.id,
          memberUserId: a.member_user_id,
          name: mp?.full_name || 'Member',
          email: mp?.email || '',
          avatarUrl: mp?.avatar_url || null,
          status: a.status,
          assignedAt: a.assigned_at,
        });
      }
    }

    return {
      id: member.id,
      userId: member.user_id,
      organizationId: member.organization_id,
      name: profile?.full_name || 'Personal Trainer',
      email: profile?.email || '',
      avatarUrl: profile?.avatar_url || null,
      role: member.role,
      status: member.status || 'active',
      joinedAt: member.created_at,
      assignedMemberCount: assignedMembers.length,
      locationId: member.location_id || null,
      locationName: (member as any).location?.name || null,
      assignedMembers,
    };
  }

  /**
   * Verifies if a user is an active trainer in this organization
   */
  async isTrainerInOrg(orgId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('role', 'Trainer')
      .single();

    return !!data;
  }

  /**
   * Verifies if a user is an eligible member in this organization
   */
  async isMemberInOrg(orgId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('role', 'Member')
      .single();

    return !!data;
  }

  /**
   * Finds any active assignment for a member in this organization
   */
  async findActiveAssignmentForMember(
    orgId: string,
    memberUserId: string
  ): Promise<TrainerMemberAssignmentRecord | null> {
    const { data, error } = await this.supabase
      .from('trainer_member_assignments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('member_user_id', memberUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) return null;
    return data as TrainerMemberAssignmentRecord;
  }

  /**
   * Finds an assignment by ID within the organization
   */
  async findAssignmentById(
    orgId: string,
    assignmentId: string
  ): Promise<TrainerMemberAssignmentRecord | null> {
    const { data, error } = await this.supabase
      .from('trainer_member_assignments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', assignmentId)
      .maybeSingle();

    if (error || !data) return null;
    return data as TrainerMemberAssignmentRecord;
  }

  /**
   * Creates or activates an assignment
   */
  async createAssignment(record: {
    organization_id: string;
    trainer_user_id: string;
    member_user_id: string;
    status: 'active';
  }): Promise<TrainerMemberAssignmentRecord | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('trainer_member_assignments')
      .insert([
        {
          ...record,
          assigned_at: now,
          created_at: now,
          updated_at: now,
        },
      ])
      .select()
      .single();

    if (error || !data) return null;
    return data as TrainerMemberAssignmentRecord;
  }

  /**
   * Deactivates an active assignment (reassign / remove)
   */
  async removeAssignment(orgId: string, assignmentId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('trainer_member_assignments')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('id', assignmentId)
      .select();

    return !error && !!data && data.length > 0;
  }
}
