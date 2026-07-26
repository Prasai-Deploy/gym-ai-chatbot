import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { IRepository } from '../interfaces/IRepository';
import { logger } from '@logger/index';

export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  protected constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly tableName: string
  ) {}

  public async findById(id: ID): Promise<Result<T | null, AppError>> {
    const start = performance.now();
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ok(null);
        }
        throw error;
      }

      return ok(data as T);
    } catch (err: any) {
      logger.error({ err, table: this.tableName, id }, 'Database error in findById');
      return fail(new AppError(err.message || 'Database error', 500));
    } finally {
      const duration = performance.now() - start;
      if (duration > 500) {
        logger.warn({ table: this.tableName, duration }, 'Slow query detected in findById');
      }
    }
  }

  public async exists(id: ID): Promise<Result<boolean, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .limit(1);

      if (error) throw error;
      return ok(data.length > 0);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async create(data: Partial<T>): Promise<Result<T, AppError>> {
    try {
      const { data: created, error } = await this.supabase
        .from(this.tableName)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return ok(created as T);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async update(id: ID, data: Partial<T>): Promise<Result<T, AppError>> {
    try {
      const { data: updated, error } = await this.supabase
        .from(this.tableName)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!updated) return fail(new NotFoundError('Entity not found'));

      return ok(updated as T);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async delete(id: ID): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);
      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async softDelete(id: ID): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async restore(id: ID): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
