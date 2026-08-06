import { OrganizationRepository } from './organization.repository';
import { Organization, OrganizationLocation, OrganizationBranding, OrganizationStaff } from './organization.types';

export class OrganizationService {
  private repository = new OrganizationRepository();

  async getOrganizationDetails(orgId: string): Promise<{
    organization: Organization | null;
    locations: OrganizationLocation[];
    branding: OrganizationBranding | null;
    staff: OrganizationStaff[];
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

  async recordAuditEvent(orgId: string, userId: string | undefined, action: string, entityType: string, entityId?: string, metadata?: Record<string, any>) {
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
