import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ForbiddenError, ValidationError } from '@errors/AppError';
import { OrganizationRepository } from '../../../organization/organization.repository';
import { OwnerAnalyticsService } from '../../../analytics/ownerAnalytics.service';
import { AttendanceRepository } from '../../../attendance/attendance.repository';
import { TrainerRepository } from '../../../trainer/trainer.repository';
import { NotificationService } from '../../../notification/notification.service';
import { OrgBillingService } from '../../../billing/organization/orgBilling.service';

// ─────────────────────────────────────────────────────────────
// 1. get_organization_overview
// ─────────────────────────────────────────────────────────────
const emptyObjectSchema = z.object({}).catchall(z.any());

export class GetOrganizationOverviewTool extends BaseTool<any, any> {
  public readonly name = 'get_organization_overview';
  public readonly description =
    'Retrieves high-level gym operational overview including member counts, active staff, locations count, today check-ins, and active facility occupancy.';
  public readonly inputSchema = emptyObjectSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(private readonly orgRepo: OrganizationRepository) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for business tool execution', 400));
      }

      const overview = await this.orgRepo.getOverview(context.organizationId);
      if (!overview) {
        return fail(new AppError(`Organization '${context.organizationId}' not found`, 404));
      }

      return ok({
        success: true,
        data: {
          organizationName: overview.organization.name,
          slug: overview.organization.slug,
          status: overview.organization.status,
          metrics: {
            totalMembers: overview.metrics.totalMembers,
            activeStaffCount: overview.metrics.activeStaffCount,
            totalLocations: overview.metrics.totalLocations,
            todayCheckIns: overview.metrics.todayCheckIns,
            currentlyInFacility: overview.metrics.currentlyInFacility,
          },
          locationsCount: overview.locations.length,
          locations: overview.locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            isPrimary: loc.is_primary,
          })),
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve organization overview: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: { type: 'object', properties: {} },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. get_member_summary
// ─────────────────────────────────────────────────────────────
const timeWindowSchema = z.object({
  window: z.enum(['7d', '30d', '90d']).default('30d').optional(),
});

export class GetMemberSummaryTool extends BaseTool<any, any> {
  public readonly name = 'get_member_summary';
  public readonly description =
    'Retrieves member distribution summary (active, trial, inactive), new enrollments, and growth comparisons for a specified time window (7d, 30d, 90d).';
  public readonly inputSchema = timeWindowSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(private readonly analyticsService: OwnerAnalyticsService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for member summary', 400));
      }

      const bounds = this.analyticsService.parseTimeWindow(input?.window || '30d');
      const data = await this.analyticsService.getMemberAnalytics(context.organizationId, bounds);

      return ok({
        success: true,
        data: {
          timeWindow: bounds.window,
          period: { from: bounds.from, to: bounds.to },
          totalMembers: data.totalMembers,
          activeMembers: data.activeMembers,
          trialMembers: data.trialMembers,
          inactiveMembers: data.inactiveMembers,
          newMembersInPeriod: data.newMembers,
          growthComparison: data.growth.comparisonText,
          hasData: data.hasData,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve member summary: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            window: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              description: 'Time window for member metrics comparison (default 30d)',
            },
          },
        },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. get_attendance_summary
// ─────────────────────────────────────────────────────────────
export class GetAttendanceSummaryTool extends BaseTool<any, any> {
  public readonly name = 'get_attendance_summary';
  public readonly description =
    'Retrieves gym attendance statistics including total visits, unique members, average daily visits, peak hours, and peak days.';
  public readonly inputSchema = timeWindowSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(
    private readonly analyticsService: OwnerAnalyticsService,
    private readonly attendanceRepo: AttendanceRepository
  ) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for attendance summary', 400));
      }

      const bounds = this.analyticsService.parseTimeWindow(input?.window || '30d');
      const [analyticsData, todayOverview] = await Promise.all([
        this.analyticsService.getAttendanceAnalytics(context.organizationId, bounds),
        this.attendanceRepo.getTodayOverview(context.organizationId),
      ]);

      return ok({
        success: true,
        data: {
          timeWindow: bounds.window,
          period: { from: bounds.from, to: bounds.to },
          today: {
            checkInsToday: todayOverview.totalCheckInsToday,
            currentlyInsideCount: todayOverview.currentlyInsideCount,
          },
          periodSummary: {
            totalVisits: analyticsData.totalVisits,
            uniqueMembers: analyticsData.uniqueMembers,
            avgDailyVisits: analyticsData.avgDailyVisits,
            avgVisitsPerMember: analyticsData.avgVisitsPerMember,
            avgDurationMinutes: analyticsData.avgDurationMinutes,
            peakHour: analyticsData.peakHour,
            peakDay: analyticsData.peakDay,
            visitsComparison: analyticsData.visitsComparison.comparisonText,
          },
          hasData: analyticsData.hasData,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve attendance summary: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            window: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              description: 'Time window for attendance analysis (default 30d)',
            },
          },
        },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. get_trainer_assignments
// ─────────────────────────────────────────────────────────────
export class GetTrainerAssignmentsTool extends BaseTool<any, any> {
  public readonly name = 'get_trainer_assignments';
  public readonly description =
    'Retrieves personal trainer allocation statistics, assigned member counts, unassigned member count, and trainer roster workload.';
  public readonly inputSchema = emptyObjectSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(private readonly analyticsService: OwnerAnalyticsService) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for trainer assignments', 400));
      }

      const bounds = this.analyticsService.parseTimeWindow('30d');
      const data = await this.analyticsService.getTrainerAnalytics(context.organizationId, bounds);

      return ok({
        success: true,
        data: {
          totalTrainers: data.totalTrainers,
          assignedMembers: data.assignedMembers,
          unassignedMembers: data.unassignedMembers,
          avgMembersPerTrainer: data.avgMembersPerTrainer,
          trainerWorkloads: data.rosterDistribution.map((t) => ({
            trainerName: t.name,
            assignedClientsCount: t.assignedMembersCount,
          })),
          hasData: data.hasData,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve trainer assignments: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: { type: 'object', properties: {} },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 5. get_retention_summary
// ─────────────────────────────────────────────────────────────
export class GetRetentionSummaryTool extends BaseTool<any, any> {
  public readonly name = 'get_retention_summary';
  public readonly description =
    'Retrieves deterministic member attendance retention rate, returning attendee counts, and historical retention comparison for a specified time window (7d, 30d, 90d).';
  public readonly inputSchema = timeWindowSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(private readonly analyticsService: OwnerAnalyticsService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for retention summary', 400));
      }

      const bounds = this.analyticsService.parseTimeWindow(input?.window || '30d');
      const data = await this.analyticsService.getRetentionAnalytics(context.organizationId, bounds);

      return ok({
        success: true,
        data: {
          timeWindow: bounds.window,
          period: { from: bounds.from, to: bounds.to },
          retentionRatePct: data.retentionRate,
          returningMembers: data.returningMembers,
          previousUniqueMembers: data.previousUniqueMembers,
          status: data.status,
          definition: data.definition,
          message: data.message,
          activeMemberRatioPct: data.activeMemberRatio,
          hasData: data.hasData,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve retention summary: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            window: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              description: 'Time window for retention analysis (default 30d)',
            },
          },
        },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 6. get_attention_items
// ─────────────────────────────────────────────────────────────
export class GetAttentionItemsTool extends BaseTool<any, any> {
  public readonly name = 'get_attention_items';
  public readonly description =
    'Retrieves prioritized operational attention items requiring owner or staff action, such as past-due billing, unassigned members, or missing club locations.';
  public readonly inputSchema = emptyObjectSchema;
  public readonly requiredRole = ['Organization Owner', 'Gym Manager', 'Platform Super Admin'];

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for attention items', 400));
      }

      const userRole = context.userRole || 'Organization Owner';
      const summary = await this.notificationService.getAttentionSummary(
        context.organizationId,
        context.userId,
        userRole
      );

      const items = (summary.attentionItems || []).map((item) => ({
        severity: item.severity,
        title: item.title,
        message: item.message,
        actionPath: item.actionPath,
        actionLabel: item.actionLabel,
      }));

      return ok({
        success: true,
        data: {
          totalAttentionItems: items.length,
          items,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve attention items: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: { type: 'object', properties: {} },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 7. get_organization_billing_status
// ─────────────────────────────────────────────────────────────
const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export class GetOrganizationBillingStatusTool extends BaseTool<any, any> {
  public readonly name = 'get_organization_billing_status';
  public readonly description =
    'Retrieves organization B2B software subscription status, plan tier, and cash collection summary. Strictly restricted to Organization Owners and Platform Super Admins.';
  public readonly inputSchema = dateRangeSchema;
  // RESTRICTED: Gym Manager is explicitly NOT allowed to access organization billing status
  public readonly requiredRole = ['Organization Owner', 'Platform Super Admin'];

  constructor(private readonly billingService: OrgBillingService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      if (!context.organizationId) {
        return fail(new AppError('Tenant organization ID required for billing status', 400));
      }

      // Explicit role check redundancy to ensure Gym Manager or other staff cannot call this tool
      const role = context.userRole;
      if (role !== 'Organization Owner' && role !== 'Platform Super Admin') {
        return fail(
          new ForbiddenError('Access to organization billing status is strictly restricted to Organization Owners')
        );
      }

      const summary = await this.billingService.getFinancialSummary(
        context.organizationId,
        input?.from,
        input?.to
      );

      return ok({
        success: true,
        data: {
          subscriptionStatus: summary.subscriptionStatus,
          activePlanCode: summary.activePlanCode,
          pricingStatus: summary.pricingStatus,
          totalCollectedFormatted: summary.totalCollectedFormatted,
          paidInvoicesCount: summary.paidInvoicesCount,
          unpaidInvoicesCount: summary.unpaidInvoicesCount,
          currency: summary.currency,
          accountingNote: summary.accountingNote,
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve organization billing status: ${err.message}`, 500));
    }
  }

  public override getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Optional start date YYYY-MM-DD for cash collection query',
            },
            to: {
              type: 'string',
              description: 'Optional end date YYYY-MM-DD for cash collection query',
            },
          },
        },
      },
    };
  }
}
