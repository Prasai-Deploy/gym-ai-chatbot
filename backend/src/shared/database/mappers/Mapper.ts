import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

/**
 * Interface defining the expected behavior for any mapping layer.
 * Enforces the strict conversion between raw database rows,
 * rich Domain Entities, and plain DTOs sent over the wire.
 */
export interface IMapper<TEntity, TModel, TDTO> {
  toDomain(raw: TModel): TEntity;
  toPersistence(entity: TEntity): TModel;
  toDTO(entity: TEntity): TDTO;
}
