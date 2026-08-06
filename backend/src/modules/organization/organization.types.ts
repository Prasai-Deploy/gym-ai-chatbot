export interface Organization {
  id: string;
  name: string;
  slug: string;
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
  token: string;
  status: 'pending' | 'accepted' | 'expired';
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
