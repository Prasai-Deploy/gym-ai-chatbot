export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id?: string;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface OrganizationLocation {
  id: string;
  organization_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  is_primary: boolean;
  created_at: string;
}

export interface OrganizationBranding {
  id: string;
  organization_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  business_name: string;
  theme_mode: 'dark' | 'light';
  timezone: string;
  currency: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  location_id?: string;
  status: 'active' | 'suspended' | 'invited';
  created_at: string;
  updated_at: string;
  profiles?: {
    id?: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface OrganizationStaff {
  id: string;
  organization_id: string;
  location_id?: string;
  user_id: string;
  role_key: string;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role_key: string;
  location_id?: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invited_by?: string;
  expires_at: string;
  created_at: string;
}

export interface OrganizationAuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface InviteStaffDTO {
  email: string;
  roleKey: string;
  locationId?: string;
}

export interface AcceptInvitationDTO {
  token: string;
}

export interface UpdateMemberRoleDTO {
  role: string;
  locationId?: string;
}

export interface OrganizationAttentionItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface OrganizationOverviewMetrics {
  totalMembers: number;
  activeStaffCount: number;
  totalLocations: number;
  todayCheckIns: number;
  currentlyInFacility: number;
}

export interface OrganizationOverview {
  organization: Organization;
  locations: OrganizationLocation[];
  branding: OrganizationBranding | null;
  staff: OrganizationMember[];
  metrics: OrganizationOverviewMetrics;
  attentionItems: OrganizationAttentionItem[];
}

export interface MemberQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'trial' | 'inactive';
  role?: string;
}

export interface MemberListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: 'active' | 'trial' | 'inactive';
  membershipTier: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  joinedAt: string;
  lastActivityAt: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

export interface MemberPaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedMembersResult {
  items: MemberListItem[];
  pagination: MemberPaginationMetadata;
}

export interface MemberDetailView {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  role: string;
  status: 'active' | 'trial' | 'inactive';
  joinedAt: string;
  locationId: string | null;
  locationName: string | null;
  membership: {
    status: 'active' | 'trial' | 'inactive';
    tier: string | null;
    isTrial: boolean;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  fitnessSummary: {
    level: string | null;
    primaryGoal: string | null;
  } | null;
  activitySummary: {
    lastCheckInAt: string | null;
    totalCheckIns: number;
  };
}

