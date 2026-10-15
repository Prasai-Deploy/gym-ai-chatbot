import { TrainerRepository } from './trainer.repository';
import {
  TrainerListItem,
  TrainerDetailView,
  AssignMemberDTO,
  TrainerMemberAssignmentRecord,
} from './trainer.types';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@errors/AppError';

export class TrainerService {
  constructor(private readonly repository: TrainerRepository = new TrainerRepository()) {}

  /**
   * Retrieves organization trainers list
   */
  async getTrainers(
    callerRole: string,
    orgId: string,
    search?: string
  ): Promise<TrainerListItem[]> {
    const allowedRoles = ['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Trainer'];
    if (!allowedRoles.includes(callerRole)) {
      throw new ForbiddenError(`Role '${callerRole}' is not authorized to view the trainer roster`);
    }

    return this.repository.getTrainers(orgId, search);
  }

  /**
   * Retrieves trainer details and member assignments
   */
  async getTrainerDetail(
    callerUserId: string,
    callerRole: string,
    orgId: string,
    trainerUserId: string
  ): Promise<TrainerDetailView> {
    const isOwnerOrManager = ['Platform Super Admin', 'Organization Owner', 'Gym Manager'].includes(callerRole);
    const isSelfTrainer = callerRole === 'Trainer' && callerUserId === trainerUserId;

    if (!isOwnerOrManager && !isSelfTrainer) {
      throw new ForbiddenError('Unauthorized to inspect this trainer assignment details');
    }

    const trainer = await this.repository.getTrainerDetail(orgId, trainerUserId);
    if (!trainer) {
      throw new NotFoundError(`Trainer '${trainerUserId}' not found in this organization`);
    }

    return trainer;
  }

  /**
   * Assigns an organization member to a trainer
   */
  async assignMember(
    callerUserId: string,
    callerRole: string,
    orgId: string,
    dto: AssignMemberDTO
  ): Promise<TrainerMemberAssignmentRecord> {
    const allowedManagementRoles = ['Platform Super Admin', 'Organization Owner', 'Gym Manager'];
    if (!allowedManagementRoles.includes(callerRole)) {
      throw new ForbiddenError(`Role '${callerRole}' is not authorized to manage trainer assignments`);
    }

    if (!dto.trainerUserId || !dto.memberUserId) {
      throw new ValidationError('Both trainerUserId and memberUserId are required');
    }

    // A member cannot self-assign as their own trainer
    if (dto.trainerUserId === dto.memberUserId) {
      throw new ValidationError('A member cannot be assigned to themselves as a trainer');
    }

    // Verify trainer belongs to organization with role = 'Trainer'
    const isTrainerValid = await this.repository.isTrainerInOrg(orgId, dto.trainerUserId);
    if (!isTrainerValid) {
      throw new ForbiddenError(`User '${dto.trainerUserId}' is not an active trainer in organization '${orgId}'`);
    }

    // Verify member belongs to organization with role = 'Member'
    const isMemberValid = await this.repository.isMemberInOrg(orgId, dto.memberUserId);
    if (!isMemberValid) {
      throw new ForbiddenError(`User '${dto.memberUserId}' is not an eligible member in organization '${orgId}'`);
    }

    // Check if member already has an active assignment
    const existing = await this.repository.findActiveAssignmentForMember(orgId, dto.memberUserId);
    if (existing) {
      if (existing.trainer_user_id === dto.trainerUserId) {
        throw new ConflictError('Member is already actively assigned to this trainer');
      }

      // Reassignment: Deactivate previous active assignment
      await this.repository.removeAssignment(orgId, existing.id);
    }

    // Create new assignment
    const assignment = await this.repository.createAssignment({
      organization_id: orgId,
      trainer_user_id: dto.trainerUserId,
      member_user_id: dto.memberUserId,
      status: 'active',
    });

    if (!assignment) {
      throw new ValidationError('Failed to record trainer assignment');
    }

    return assignment;
  }

  /**
   * Removes / unassigns a member assignment
   */
  async removeAssignment(
    callerUserId: string,
    callerRole: string,
    orgId: string,
    assignmentId: string
  ): Promise<boolean> {
    const allowedManagementRoles = ['Platform Super Admin', 'Organization Owner', 'Gym Manager'];
    if (!allowedManagementRoles.includes(callerRole)) {
      throw new ForbiddenError(`Role '${callerRole}' is not authorized to remove trainer assignments`);
    }

    const assignment = await this.repository.findAssignmentById(orgId, assignmentId);
    if (!assignment) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found in this organization`);
    }

    return this.repository.removeAssignment(orgId, assignmentId);
  }
}
