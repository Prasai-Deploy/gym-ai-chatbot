export type PermissionKey =
  | 'workout:read' | 'workout:write' | 'workout:delete'
  | 'nutrition:read' | 'nutrition:write'
  | 'progress:read' | 'progress:write'
  | 'members:read' | 'members:write' | 'members:export' | 'members:delete'
  | 'billing:read' | 'billing:write' | 'billing:refund'
  | 'attendance:read' | 'attendance:write' | 'attendance:override'
  | 'trainer:read' | 'trainer:write'
  | 'admin:read' | 'admin:write'
  | 'reports:read' | 'reports:export'
  | 'settings:read' | 'settings:write'
  | 'api_keys:manage'
  | 'security:audit'
  | 'compliance:gdpr';

export type FeatureFlagKey =
  | 'ai_trinity_copilot'
  | 'multi_location_access'
  | 'pos_terminal'
  | 'automated_dunning'
  | 'advanced_analytics'
  | 'white_label_branding'
  | 'api_access'
  | 'bulk_member_import'
  | 'custom_workout_plans'
  | 'realtime_occupancy'
  | 'gdpr_export'
  | 'sso_saml'
  | 'two_factor_auth';

export type OrgPlan = 'starter' | 'growth' | 'enterprise';

export interface SecurityAuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface DeviceRecord {
  deviceId: string;
  userId: string;
  platform: string;
  userAgent: string;
  trusted: boolean;
  lastSeenAt: string;
}
