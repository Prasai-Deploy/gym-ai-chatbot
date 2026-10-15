import { supabase as defaultSupabase } from '@database/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Organization,
  OrganizationLocation,
  OrganizationBranding,
  OrganizationStaff,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationAuditLog,
  OrganizationOverview,
  OrganizationAttentionItem,
  MemberQueryOptions,
  MemberListItem,
  PaginatedMembersResult,
  MemberDetailView,
} from './organization.types';

export class OrganizationRepository {
  constructor(private readonly supabase: SupabaseClient = defaultSupabase) {}

  async findById(orgId: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  async getLocations(orgId: string): Promise<OrganizationLocation[]> {
    const { data, error } = await this.supabase
      .from('organization_locations')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) return [];
    return data as OrganizationLocation[];
  }

  async getLocationById(orgId: string, locationId: string): Promise<OrganizationLocation | null> {
    const { data, error } = await this.supabase
      .from('organization_locations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', locationId)
      .single();

    if (error || !data) return null;
    return data as OrganizationLocation;
  }

  async getBranding(orgId: string): Promise<OrganizationBranding | null> {
    const { data, error } = await this.supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error || !data) return null;
    return data as OrganizationBranding;
  }

  /**
   * Fetches staff roster from canonical organization_members (where role != 'Member'),
   * falling back to legacy organization_staff if no members are returned.
   */
  async getStaff(orgId: string): Promise<any[]> {
    const { data: memberStaff, error } = await this.supabase
      .from('organization_members')
      .select('*, profiles(*)')
      .eq('organization_id', orgId)
      .neq('role', 'Member');

    if (!error && memberStaff && memberStaff.length > 0) {
      return memberStaff;
    }

    const { data: legacyStaff } = await this.supabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', orgId);

    return legacyStaff || [];
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data: memberOrgs, error: memberErr } = await this.supabase
      .from('organization_members')
      .select('organization_id, organizations(*)')
      .eq('user_id', userId);

    const { data: ownedOrgs, error: ownerErr } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId);

    const orgs: Organization[] = [];
    if (!memberErr && memberOrgs) {
      memberOrgs.forEach((mo: any) => {
        if (mo.organizations) orgs.push(mo.organizations as Organization);
      });
    }
    if (!ownerErr && ownedOrgs) {
      ownedOrgs.forEach((o: any) => {
        if (!orgs.some((existing) => existing.id === o.id)) {
          orgs.push(o as Organization);
        }
      });
    }
    return orgs;
  }

  async isMember(orgId: string, userId: string): Promise<boolean> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .single();

    if (org?.owner_id === userId) return true;

    const { data: member } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    return !!member;
  }

  async getMember(orgId: string, userId: string): Promise<OrganizationMember | null> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('*, profiles(*)')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as OrganizationMember;
  }

  async getMembers(orgId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('*, profiles(*)')
      .eq('organization_id', orgId);

    if (error || !data) return [];
    return data;
  }

  /**
   * Fetches paginated, searchable, filterable organization members strictly scoped to orgId.
   */
  async getPaginatedMembers(
    orgId: string,
    options: MemberQueryOptions = {}
  ): Promise<PaginatedMembersResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const search = options.search?.trim();
    const statusFilter = options.status;
    const roleFilter = options.role?.trim();

    // 1. If search is provided, look up candidate user IDs in profiles
    let matchingUserIds: string[] | null = null;
    if (search && search.length > 0) {
      const { data: matchedProfiles, error: profError } = await this.supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

      if (profError || !matchedProfiles || matchedProfiles.length === 0) {
        return {
          items: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        };
      }
      matchingUserIds = matchedProfiles.map((p: any) => p.id);
    }

    // 2. Fetch all candidate organization_members for this org
    let query = this.supabase
      .from('organization_members')
      .select('*, profiles(id, email, full_name, avatar_url, timezone), location:organization_locations(id, name)')
      .eq('organization_id', orgId);

    if (matchingUserIds !== null) {
      query = query.in('user_id', matchingUserIds);
    }

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    query = query.order('created_at', { ascending: false }).order('id', { ascending: true });

    const { data: rawMembers, error: membersError } = await query;
    if (membersError || !rawMembers || rawMembers.length === 0) {
      return {
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const userIds = rawMembers.map((m: any) => m.user_id);

    // 3. Batch fetch profiles if not embedded by PostgREST
    const profileMap = new Map<string, any>();
    const hasEmbeddedProfiles = Boolean(rawMembers[0]?.profiles?.email);
    if (!hasEmbeddedProfiles && userIds.length > 0) {
      const { data: profilesData } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, timezone')
        .in('id', userIds);
      if (profilesData) {
        profilesData.forEach((p: any) => profileMap.set(p.id, p));
      }
    }

    // 4. Batch fetch subscription state for real status derivation
    const subMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: subsData } = await this.supabase
        .from('subscriptions')
        .select('user_id, status, tier, trial_started_at, trial_ends_at, current_period_end')
        .in('user_id', userIds);
      if (subsData) {
        subsData.forEach((s: any) => subMap.set(s.user_id, s));
      }
    }

    // 5. Batch fetch latest attendance check-in for last activity
    const activityMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: attendanceData } = await this.supabase
        .from('attendance_logs')
        .select('user_id, check_in_time')
        .eq('organization_id', orgId)
        .in('user_id', userIds)
        .order('check_in_time', { ascending: false });
      if (attendanceData) {
        attendanceData.forEach((a: any) => {
          if (!activityMap.has(a.user_id)) {
            activityMap.set(a.user_id, a.check_in_time);
          }
        });
      }
    }

    // 6. Map to canonical MemberListItem with authoritative status
    const now = new Date();
    const mappedItems: MemberListItem[] = rawMembers.map((m: any) => {
      const profile = hasEmbeddedProfiles ? m.profiles : profileMap.get(m.user_id);
      const sub = subMap.get(m.user_id);

      const isTrial =
        sub?.status === 'trialing' ||
        Boolean(sub?.trial_ends_at && new Date(sub.trial_ends_at) > now);

      let computedStatus: 'active' | 'trial' | 'inactive' = 'inactive';
      if (m.status === 'inactive' || m.status === 'suspended') {
        computedStatus = 'inactive';
      } else if (isTrial) {
        computedStatus = 'trial';
      } else if (sub?.status === 'active') {
        computedStatus = 'active';
      } else {
        computedStatus = 'inactive';
      }

      return {
        id: m.id,
        userId: m.user_id,
        name: profile?.full_name || 'Member',
        email: profile?.email || '',
        avatarUrl: profile?.avatar_url || null,
        role: m.role || 'Member',
        status: computedStatus,
        membershipTier: sub?.tier || null,
        isTrial,
        trialEndsAt: sub?.trial_ends_at || null,
        joinedAt: m.created_at,
        lastActivityAt: activityMap.get(m.user_id) || null,
        locationId: m.location_id || null,
        locationName: m.location?.name || null,
      };
    });

    // 7. Filter by computed status if requested
    const filteredItems =
      statusFilter && statusFilter !== 'all'
        ? mappedItems.filter((item) => item.status === statusFilter)
        : mappedItems;

    // 8. Paginate stably
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const offset = (page - 1) * limit;
    const pagedItems = filteredItems.slice(offset, offset + limit);

    return {
      items: pagedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Fetches detailed, authorized member view strictly scoped to orgId.
   * Never exposes auth secrets, AI memory, or billing secrets.
   */
  async getMemberDetails(orgId: string, memberId: string): Promise<MemberDetailView | null> {
    const { data: member, error } = await this.supabase
      .from('organization_members')
      .select('*, profiles(id, email, full_name, avatar_url, timezone), location:organization_locations(id, name)')
      .eq('organization_id', orgId)
      .or(`id.eq.${memberId},user_id.eq.${memberId}`)
      .maybeSingle();

    if (error || !member) return null;

    let profile = member.profiles;
    if (!profile?.email) {
      const { data: profData } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, timezone')
        .eq('id', member.user_id)
        .maybeSingle();
      profile = profData;
    }

    const { data: sub } = await this.supabase
      .from('subscriptions')
      .select('status, tier, trial_started_at, trial_ends_at, current_period_end')
      .eq('user_id', member.user_id)
      .maybeSingle();

    let fitnessSummary: { level: string | null; primaryGoal: string | null } | null = null;
    const { data: fitnessData } = await this.supabase
      .from('v2_fitness_profiles')
      .select('level, primary_goal')
      .eq('id', member.user_id)
      .maybeSingle();

    if (fitnessData) {
      fitnessSummary = {
        level: fitnessData.level || null,
        primaryGoal: fitnessData.primary_goal || null,
      };
    } else {
      const { data: legacyFitness } = await this.supabase
        .from('fitness_profiles')
        .select('level, primary_goal')
        .eq('id', member.user_id)
        .maybeSingle();
      if (legacyFitness) {
        fitnessSummary = {
          level: legacyFitness.level || null,
          primaryGoal: legacyFitness.primary_goal || null,
        };
      }
    }

    const { data: attendances, count: totalCheckIns } = await this.supabase
      .from('attendance_logs')
      .select('check_in_time', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('user_id', member.user_id)
      .order('check_in_time', { ascending: false });

    const lastCheckInAt = attendances?.[0]?.check_in_time || null;

    const now = new Date();
    const isTrial =
      sub?.status === 'trialing' ||
      Boolean(sub?.trial_ends_at && new Date(sub.trial_ends_at) > now);

    let computedStatus: 'active' | 'trial' | 'inactive' = 'inactive';
    if (member.status === 'inactive' || member.status === 'suspended') {
      computedStatus = 'inactive';
    } else if (isTrial) {
      computedStatus = 'trial';
    } else if (sub?.status === 'active') {
      computedStatus = 'active';
    } else {
      computedStatus = 'inactive';
    }

    return {
      id: member.id,
      userId: member.user_id,
      organizationId: member.organization_id,
      name: profile?.full_name || 'Member',
      email: profile?.email || '',
      avatarUrl: profile?.avatar_url || null,
      timezone: profile?.timezone || 'UTC',
      role: member.role || 'Member',
      status: computedStatus,
      joinedAt: member.created_at,
      locationId: member.location_id || null,
      locationName: member.location?.name || null,
      membership: {
        status: computedStatus,
        tier: sub?.tier || null,
        isTrial,
        trialStartedAt: sub?.trial_started_at || null,
        trialEndsAt: sub?.trial_ends_at || null,
        currentPeriodEnd: sub?.current_period_end || null,
      },
      fitnessSummary,
      activitySummary: {
        lastCheckInAt,
        totalCheckIns: totalCheckIns || (attendances ? attendances.length : 0),
      },
    };
  }


  async upsertMember(member: {
    organization_id: string;
    user_id: string;
    role: string;
    location_id?: string;
    status?: string;
  }): Promise<OrganizationMember | null> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .upsert(
        {
          organization_id: member.organization_id,
          user_id: member.user_id,
          role: member.role,
          location_id: member.location_id,
          status: member.status || 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,user_id' }
      )
      .select()
      .single();

    if (error || !data) return null;
    return data as OrganizationMember;
  }

  async updateMemberRole(orgId: string, userId: string, role: string, locationId?: string): Promise<void> {
    const updatePayload: any = { role, updated_at: new Date().toISOString() };
    if (locationId !== undefined) {
      updatePayload.location_id = locationId;
    }

    const { error } = await this.supabase
      .from('organization_members')
      .update(updatePayload)
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async createInvitation(invitation: {
    organization_id: string;
    email: string;
    role_key: string;
    token: string;
    location_id?: string;
    invited_by: string;
    expires_at: string;
  }): Promise<OrganizationInvitation | null> {
    const { data, error } = await this.supabase
      .from('organization_invitations')
      .insert({
        organization_id: invitation.organization_id,
        email: invitation.email.toLowerCase().trim(),
        role_key: invitation.role_key,
        token: invitation.token,
        location_id: invitation.location_id,
        invited_by: invitation.invited_by,
        expires_at: invitation.expires_at,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) return null;
    return data as OrganizationInvitation;
  }

  async findInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
    const { data, error } = await this.supabase
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) return null;
    return data as OrganizationInvitation;
  }

  async updateInvitationStatus(
    id: string,
    status: 'pending' | 'accepted' | 'expired' | 'revoked'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('organization_invitations')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }

  async logAudit(log: Partial<OrganizationAuditLog>): Promise<void> {
    await this.supabase.from('organization_audit_logs').insert([log]);
  }

  /**
   * Computes a canonical, real-time overview for the organization without mock data.
   */
  async getOverview(orgId: string): Promise<OrganizationOverview | null> {
    const organization = await this.findById(orgId);
    if (!organization) return null;

    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

    const [locations, branding, staff, membersRes, todayAttendanceRes, activeAttendanceRes] = await Promise.all([
      this.getLocations(orgId),
      this.getBranding(orgId),
      this.getStaff(orgId),
      this.supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'Member'),
      this.supabase.from('attendance_logs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('check_in_time', todayStart),
      this.supabase.from('attendance_logs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    ]);

    const totalMembers = membersRes.count ?? 0;
    const todayCheckIns = todayAttendanceRes.count ?? 0;
    const currentlyInFacility = activeAttendanceRes.count ?? 0;

    const attentionItems: OrganizationAttentionItem[] = [];

    if (locations.length === 0) {
      attentionItems.push({
        id: 'no-locations',
        level: 'warning',
        title: 'No Gym Locations Configured',
        description: 'Add your primary club branch location to activate location-based access control.',
        actionLabel: 'Add Location',
        actionPath: '/owner/settings',
      });
    }

    if (staff.length === 0) {
      attentionItems.push({
        id: 'no-staff',
        level: 'info',
        title: 'Staff Roster Empty',
        description: 'Invite gym managers, trainers, and front desk operators to help run the facility.',
        actionLabel: 'Invite Staff',
        actionPath: '/owner/staff',
      });
    }

    if (totalMembers === 0) {
      attentionItems.push({
        id: 'no-members',
        level: 'info',
        title: 'No Enrolled Members Yet',
        description: 'New members who join your organization will be tracked in real-time here.',
      });
    }

    return {
      organization,
      locations,
      branding,
      staff,
      metrics: {
        totalMembers,
        activeStaffCount: staff.length,
        totalLocations: locations.length,
        todayCheckIns,
        currentlyInFacility,
      },
      attentionItems,
    };
  }
}

