import { AdminRepository } from '../repositories/AdminRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { AdminDashboardStats, Member, MembershipPlan, AssignPlanDTO } from '../domain/AdminSchemas';
import { logger } from '@logger/index';

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  public async getDashboardStats(
    organizationId: string,
  ): Promise<Result<AdminDashboardStats, AppError>> {
    return this.repository.getDashboardStats(organizationId);
  }

  public async getMembers(
    organizationId: string,
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
    },
  ): Promise<Result<Member[], AppError>> {
    const { limit = 50, offset = 0, search } = params ?? {};
    return this.repository.getMembers(organizationId, limit, offset, search);
  }

  public async getMembershipPlans(
    organizationId: string,
  ): Promise<Result<MembershipPlan[], AppError>> {
    return this.repository.getMembershipPlans(organizationId);
  }

  public async assignPlan(
    organizationId: string,
    dto: AssignPlanDTO,
  ): Promise<Result<void, AppError>> {
    const result = await this.repository.assignPlan(organizationId, dto);
    if (result.isSuccess()) {
      logger.info({ dto }, '[AdminService] Plan assigned successfully');
    }
    return result;
  }
}
