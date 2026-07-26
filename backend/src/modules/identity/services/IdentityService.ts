import { IIdentityRepository } from '../repositories/IIdentityRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { 
  UpdateProfileDTO, 
  UpdateFitnessProfileDTO, 
  UpdatePreferencesDTO,
  Profile,
  FitnessProfile,
  UserPreferences
} from '../domain/IdentitySchemas';
import { logger } from '@logger/index';

export class IdentityService {
  constructor(private readonly repository: IIdentityRepository) {}

  public async getProfile(userId: string): Promise<Result<Profile, AppError>> {
    const result = await this.repository.findByAuthId(userId);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    if (!result.value) return fail(new NotFoundError('Profile not found'));
    
    return ok(result.value);
  }

  public async updateProfile(userId: string, dto: UpdateProfileDTO): Promise<Result<Profile, AppError>> {
    const result = await this.repository.update(userId, dto);
    if (result.isFailure()) return result;
    
    // Future: Publish ProfileUpdatedEvent here
    logger.info({ userId }, 'Profile updated');
    return result;
  }

  public async getFitnessProfile(userId: string): Promise<Result<FitnessProfile, AppError>> {
    const result = await this.repository.findFitnessProfile(userId);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    if (!result.value) return fail(new NotFoundError('Fitness Profile not found'));
    
    return ok(result.value);
  }

  public async updateFitnessProfile(userId: string, dto: UpdateFitnessProfileDTO): Promise<Result<FitnessProfile, AppError>> {
    const result = await this.repository.updateFitnessProfile(userId, dto);
    if (result.isFailure()) return result;
    
    // Future: Publish FitnessProfileUpdatedEvent here
    logger.info({ userId }, 'Fitness Profile updated');
    return result;
  }

  public async getPreferences(userId: string): Promise<Result<UserPreferences, AppError>> {
    const result = await this.repository.findPreferences(userId);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    if (!result.value) return fail(new NotFoundError('Preferences not found'));
    
    return ok(result.value);
  }

  public async updatePreferences(userId: string, dto: UpdatePreferencesDTO): Promise<Result<UserPreferences, AppError>> {
    const result = await this.repository.updatePreferences(userId, dto);
    if (result.isFailure()) return result;
    
    // Future: Publish PreferencesUpdatedEvent here
    logger.info({ userId }, 'Preferences updated');
    return result;
  }

  public async resetDemoData(userId: string): Promise<Result<void, AppError>> {
    const result = await this.repository.resetDemoData(userId);
    if (result.isFailure()) return result;
    
    logger.info({ userId }, 'Demo data reset successfully');
    return result;
  }
}
