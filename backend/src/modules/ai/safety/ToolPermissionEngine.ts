import { BaseTool, ToolContext } from '../tools/BaseTool';
import { Result, ok, fail } from '@shared/core/Result';
import { ForbiddenError } from '@errors/AppError';

export class ToolPermissionEngine {
  public validateToolExecution(
    tool: BaseTool<any, any>,
    context: ToolContext,
    input: any
  ): Result<boolean, ForbiddenError> {
    if (!context || !context.userId) {
      return fail(new ForbiddenError('Authenticated context required for tool execution'));
    }

    const userRole = context.userRole || 'Member';

    // Role Verification across all 8 supported roles:
    // Platform Super Admin, Organization Owner, Gym Manager, Front Desk, Trainer, Nutritionist, Member, Demo User
    if (userRole === 'Demo User') {
      if (!tool.name.startsWith('get_')) {
        return fail(
          new ForbiddenError(`Demo User role is restricted to read-only tool operations ('${tool.name}' denied)`)
        );
      }
    }

    if (tool.requiredRole) {
      const allowedRoles = Array.isArray(tool.requiredRole) ? tool.requiredRole : [tool.requiredRole];
      const isSuperAdminOrOwner = userRole === 'Platform Super Admin' || userRole === 'Organization Owner';
      if (!isSuperAdminOrOwner && !allowedRoles.includes(userRole)) {
        return fail(new ForbiddenError(`User role '${userRole}' is unauthorized to execute tool '${tool.name}'`));
      }
    }

    // Tenant / User Ownership Boundary Verification
    // Ensure input payload does not spoof a different user_id or organization_id
    if (input && typeof input === 'object') {
      const spoofedId = input.user_id || input.userId || input.member_id || input.memberId;
      if (spoofedId && spoofedId !== context.userId) {
        return fail(
          new ForbiddenError(
            `Cross-user modification denied: Input user ID ('${spoofedId}') does not match authenticated identity ('${context.userId}')`
          )
        );
      }

      const spoofedOrg = input.organization_id || input.organizationId || input.tenant_id || input.tenantId;
      if (spoofedOrg && context.organizationId && spoofedOrg !== context.organizationId) {
        return fail(
          new ForbiddenError(
            `Cross-tenant access denied: Input organization ID ('${spoofedOrg}') does not match authenticated tenant ('${context.organizationId}')`
          )
        );
      }
    }

    return ok(true);
  }
}
