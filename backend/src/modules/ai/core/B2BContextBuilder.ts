import { OrganizationRepository } from '../../organization/organization.repository';

export interface B2BOrganizationContext {
  organizationId: string;
  userId: string;
  userRole: string;
  organizationName?: string;
  organizationStatus?: string;
  totalMembers?: number;
  activeStaffCount?: number;
  totalLocations?: number;
  todayCheckIns?: number;
  currentlyInFacility?: number;
}

export class B2BContextBuilder {
  constructor(private readonly orgRepo: OrganizationRepository) {}

  public async buildContext(
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<B2BOrganizationContext> {
    try {
      const overview = await this.orgRepo.getOverview(organizationId);
      if (!overview) {
        return {
          organizationId,
          userId,
          userRole,
        };
      }

      return {
        organizationId,
        userId,
        userRole,
        organizationName: overview.organization.name,
        organizationStatus: overview.organization.status,
        totalMembers: overview.metrics.totalMembers,
        activeStaffCount: overview.metrics.activeStaffCount,
        totalLocations: overview.metrics.totalLocations,
        todayCheckIns: overview.metrics.todayCheckIns,
        currentlyInFacility: overview.metrics.currentlyInFacility,
      };
    } catch {
      return {
        organizationId,
        userId,
        userRole,
      };
    }
  }

  public formatContextSummary(ctx: B2BOrganizationContext): string {
    const lines: string[] = ['=== STRIVA V2 TRINETRA BUSINESS CONTEXT ==='];
    if (ctx.organizationName) {
      lines.push(`Organization: ${ctx.organizationName} (ID: ${ctx.organizationId})`);
    } else {
      lines.push(`Organization ID: ${ctx.organizationId}`);
    }
    lines.push(`Staff Role: ${ctx.userRole}`);
    if (ctx.organizationStatus) {
      lines.push(`Organization Status: ${ctx.organizationStatus}`);
    }

    if (typeof ctx.totalMembers === 'number') {
      lines.push(
        `Operational Snapshot: ${ctx.totalMembers} total members enrolled, ${ctx.activeStaffCount ?? 0} active staff, ${ctx.totalLocations ?? 0} branch locations.`
      );
    }
    if (typeof ctx.todayCheckIns === 'number') {
      lines.push(
        `Today Check-Ins: ${ctx.todayCheckIns} total check-ins recorded today (${ctx.currentlyInFacility ?? 0} currently inside facility).`
      );
    }

    lines.push(
      'Role Mandate: You are TRINETRA, the executive AI advisor for STRIVA gym management. Provide calm, objective, data-backed operational intelligence. All tools are read-only.'
    );

    return lines.join('\n');
  }
}
