import { AdminRepository } from '../repositories/AdminRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import {
  AdminDashboardStats,
  Member,
  MembershipPlan,
  AssignPlanDTO,
} from '../domain/AdminSchemas';
import { logger } from '@logger/index';

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  public async getDashboardStats(): Promise<Result<AdminDashboardStats, AppError>> {
    return this.repository.getDashboardStats();
  }

  public async getMembers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Result<Member[], AppError>> {
    const { limit = 50, offset = 0, search } = params ?? {};
    return this.repository.getMembers(limit, offset, search);
  }

  public async getMembershipPlans(): Promise<Result<MembershipPlan[], AppError>> {
    return this.repository.getMembershipPlans();
  }

  public async assignPlan(dto: AssignPlanDTO): Promise<Result<void, AppError>> {
    const result = await this.repository.assignPlan(dto);
    if (result.isSuccess()) {
      logger.info({ dto }, '[AdminService] Plan assigned successfully');
    }
    return result;
  }
}
