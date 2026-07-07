import { MemoryRepository } from '../repositories/MemoryRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { SetMemoryDTO, MemoryContextDTO } from '../domain/IntelligenceSchemas';
import { eventBus } from '@shared/core/EventBus';

export class MemoryService {
  constructor(private readonly repository: MemoryRepository) {}

  public async setMemory(userId: string, dto: SetMemoryDTO): Promise<Result<any, AppError>> {
    const result = await this.repository.setMemory(userId, dto);
    if (result.isSuccess()) {
      eventBus.publish('Memory.UPDATED', { userId, category: dto.category, key: dto.key });
    }
    return result;
  }

  public async getMemoryContext(userId: string): Promise<Result<MemoryContextDTO, AppError>> {
    const getCategory = async (cat: string) => {
      const res = await this.repository.getMemoryByCategory(userId, cat);
      if (res.isFailure()) return {};
      const dict: Record<string, any> = {};
      res.value.forEach((item: any) => {
        dict[item.key] = item.value;
      });
      return dict;
    };

    const preferences = await getCategory('PREFERENCE');
    const injuries = await getCategory('INJURY');
    const goals = await getCategory('GOAL');

    return ok({
      preferences,
      injuries,
      goals
    });
  }
}
