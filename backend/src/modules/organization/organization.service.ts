import crypto from 'crypto';
import { OrganizationRepository } from './organization.repository';
import {
  Organization,
  OrganizationLocation,
  OrganizationBranding,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationOverview,
  InviteStaffDTO,
  MemberQueryOptions,
  PaginatedMembersResult,
  MemberDetailView,
} from './organization.types';
import { ForbiddenError, ValidationError, NotFoundError } from '@errors/AppError';
import { UserRole } from '@middleware/rbac.middleware';

export const ALLOWED_INVITE_ROLES: UserRole[] = [
  'Organization Owner',
  'Gym Manager',
  'Trainer',
  'Nutritionist',
  'Front Desk',
  'Member',
];

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository = new OrganizationRepository()) {}

  async getOrganizationDetails(orgId: string): Promise<{
    organization: Organization | null;
    locations: OrganizationLocation[];
    branding: OrganizationBranding | null;
    staff: any[];
  }> {
    const organization = await this.repository.findById(orgId);
    const locations = await this.repository.getLocations(orgId);
    const branding = await this.repository.getBranding(orgId);
    const staff = await this.repository.getStaff(orgId);

    return {
      organization,
      locations,
      branding,
      staff,
    };
  }

  async getOverview(orgId: string): Promise<OrganizationOverview> {
    const overview = await this.repository.getOverview(orgId);
    if (!overview) {
      throw new NotFoundError(`Organization with ID '${orgId}' not found`);
    }
    return overview;
  }

  async listUserOrganizations(userId: string): Promise<Organization[]> {
    return this.repository.getUserOrganizations(userId);
  }

  async isMember(orgId: string, userId: string): Promise<boolean> {
    return this.repository.isMember(orgId, userId);
  }

  async getLocations(orgId: string): Promise<OrganizationLocation[]> {
    return this.repository.getLocations(orgId);
  }

  async getMembers(orgId: string): Promise<any[]> {
    return this.repository.getMembers(orgId);
  }

  async getPaginatedMembers(
    orgId: string,
    options: MemberQueryOptions
  ): Promise<PaginatedMembersResult> {
    return this.repository.getPaginatedMembers(orgId, options);
  }

  async getMemberDetails(orgId: string, memberId: string): Promise<MemberDetailView | null> {
    return this.repository.getMemberDetails(orgId, memberId);
  }

  async getStaff(orgId: string): Promise<any[]> {
    return this.repository.getStaff(orgId);
  }

  /**
   * Invites a new staff member or member to the organization with strict RBAC escalation guards.
   */
  async inviteStaff(
    orgId: string,
    callerUserId: string,
    callerRole: string,
    dto: InviteStaffDTO
  ): Promise<OrganizationInvitation> {
    // 1. Caller role authorization
    if (callerRole === 'Demo User') {
      throw new ForbiddenError('Demo users are not authorized to send invitations');
    }

    const authorizedInviterRoles = ['Platform Super Admin', 'Organization Owner', 'Gym Manager'];
    if (!authorizedInviterRoles.includes(callerRole)) {
      throw new ForbiddenError(`Role '${callerRole}' is not authorized to issue organization invitations`);
    }

    // 2. Target role validation
    const targetRole = dto.roleKey as UserRole;
    if (targetRole === 'Platform Super Admin') {
      throw new ForbiddenError('Platform Super Admin role cannot be granted through organization invitations');
    }

    if (!ALLOWED_INVITE_ROLES.includes(targetRole)) {
      throw new ValidationError(`Invalid role '${dto.roleKey}' specified for invitation`);
    }

    // 3. Prevent privilege escalation
    if (callerRole === 'Gym Manager' && (targetRole === 'Organization Owner' || targetRole === 'Gym Manager')) {
      throw new ForbiddenError('Gym Managers cannot invite Organization Owners or other Gym Managers');
    }

    // 4. Validate location if specified
    if (dto.locationId) {
      const location = await this.repository.getLocationById(orgId, dto.locationId);
      if (!location) {
        throw new NotFoundError(`Location '${dto.locationId}' does not belong to organization '${orgId}'`);
      }
    }

    // 5. Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invitation = await this.repository.createInvitation({
      organization_id: orgId,
      email: dto.email,
      role_key: targetRole,
      token,
      location_id: dto.locationId,
      invited_by: callerUserId,
      expires_at: expiresAt,
    });

    if (!invitation) {
      throw new ValidationError('Failed to create invitation record');
    }

    await this.recordAuditEvent(orgId, callerUserId, 'invitation.created', 'organization_invitation', invitation.id, {
      email: dto.email,
      role: targetRole,
    });

    return invitation;
  }

  /**
   * Accepts an invitation, validates expiration & identity match, and assigns organization membership.
   */
  async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string,
    userRole?: string
  ): Promise<OrganizationMember> {
    // 1. Demo User Guard
    if (userEmail.toLowerCase() === 'demo@sweatfix.com' || userRole === 'Demo User') {
      throw new ForbiddenError('Demo users cannot accept staff invitations or join organizations as staff');
    }

    // 2. Lookup invitation by token
    const invitation = await this.repository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invalid invitation token');
    }

    // 3. Status checks
    if (invitation.status !== 'pending') {
      throw new ValidationError(`Invitation is no longer valid (status: ${invitation.status})`);
    }

    // 4. Expiration check
    if (new Date() > new Date(invitation.expires_at)) {
      await this.repository.updateInvitationStatus(invitation.id, 'expired');
      throw new ValidationError('Invitation has expired');
    }

    // 5. Email matching check
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenError('Authenticated email does not match invitation recipient email');
    }

    // 6. Upsert membership
    const member = await this.repository.upsertMember({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role_key,
      location_id: invitation.location_id,
      status: 'active',
    });

    if (!member) {
      throw new ValidationError('Failed to activate organization membership');
    }

    // 7. Mark invitation accepted
    await this.repository.updateInvitationStatus(invitation.id, 'accepted');

    await this.recordAuditEvent(
      invitation.organization_id,
      userId,
      'invitation.accepted',
      'organization_member',
      member.id,
      { role: invitation.role_key }
    );

    return member;
  }

  /**
   * Modifies an existing member's role with strict escalation prevention.
   */
  async updateMemberRole(
    orgId: string,
    callerUserId: string,
    callerRole: string,
    targetUserId: string,
    newRole: string,
    locationId?: string
  ): Promise<void> {
    // 1. Prevent self-promotion or self-modification
    if (callerUserId === targetUserId) {
      throw new ForbiddenError('Users cannot modify their own organization role');
    }

    if (callerRole === 'Demo User') {
      throw new ForbiddenError('Demo users cannot modify organization roles');
    }

    // 2. Validate new role
    if (newRole === 'Platform Super Admin') {
      throw new ForbiddenError('Platform Super Admin role cannot be granted at the organization level');
    }

    if (!ALLOWED_INVITE_ROLES.includes(newRole as UserRole)) {
      throw new ValidationError(`Invalid role '${newRole}' specified`);
    }

    // 3. Caller role authorization
    if (callerRole !== 'Platform Super Admin' && callerRole !== 'Organization Owner') {
      throw new ForbiddenError(`Role '${callerRole}' is not authorized to update member roles`);
    }

    // 4. Update role
    await this.repository.updateMemberRole(orgId, targetUserId, newRole, locationId);

    await this.recordAuditEvent(orgId, callerUserId, 'member.role_updated', 'organization_member', targetUserId, {
      new_role: newRole,
      location_id: locationId,
    });
  }

  async recordAuditEvent(
    orgId: string,
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.repository.logAudit({
      organization_id: orgId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }
}

