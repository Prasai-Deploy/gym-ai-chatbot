import { PermissionKey } from './security.types';

// Role → Permissions matrix
const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  'Platform Super Admin': [
    'workout:read','workout:write','workout:delete',
    'nutrition:read','nutrition:write',
    'progress:read','progress:write',
    'members:read','members:write','members:export','members:delete',
    'billing:read','billing:write','billing:refund',
    'attendance:read','attendance:write','attendance:override',
    'trainer:read','trainer:write',
    'admin:read','admin:write',
    'reports:read','reports:export',
    'settings:read','settings:write',
    'api_keys:manage','security:audit','compliance:gdpr',
  ],
  'Organization Owner': [
    'workout:read','workout:write',
    'nutrition:read','nutrition:write',
    'progress:read','progress:write',
    'members:read','members:write','members:export','members:delete',
    'billing:read','billing:write','billing:refund',
    'attendance:read','attendance:write','attendance:override',
    'trainer:read','trainer:write',
    'admin:read','admin:write',
    'reports:read','reports:export',
    'settings:read','settings:write',
    'compliance:gdpr',
  ],
  'Gym Manager': [
    'workout:read','workout:write',
    'nutrition:read',
    'progress:read',
    'members:read','members:write',
    'billing:read',
    'attendance:read','attendance:write','attendance:override',
    'trainer:read','trainer:write',
    'reports:read',
    'settings:read',
  ],
  'Front Desk': [
    'members:read',
    'attendance:read','attendance:write',
    'billing:read',
  ],
  'Trainer': [
    'workout:read','workout:write',
    'nutrition:read','nutrition:write',
    'progress:read',
    'members:read',
    'trainer:read','trainer:write',
  ],
  'Nutritionist': [
    'nutrition:read','nutrition:write',
    'progress:read',
    'members:read',
  ],
  'Member': [
    'workout:read','workout:write',
    'nutrition:read','nutrition:write',
    'progress:read','progress:write',
  ],
  'Demo User': [
    'workout:read',
    'nutrition:read',
    'progress:read',
    'members:read',
    'billing:read',
    'attendance:read',
  ],
};

export class PermissionService {
  public hasPermission(roleKey: string, permission: PermissionKey): boolean {
    const permissions = ROLE_PERMISSIONS[roleKey] || [];
    return permissions.includes(permission);
  }

  public getPermissionsForRole(roleKey: string): PermissionKey[] {
    return ROLE_PERMISSIONS[roleKey] || [];
  }

  public requirePermission(roleKey: string, permission: PermissionKey): void {
    if (!this.hasPermission(roleKey, permission)) {
      throw new Error(`Role '${roleKey}' does not have permission '${permission}'.`);
    }
  }
}

export const permissionService = new PermissionService();
