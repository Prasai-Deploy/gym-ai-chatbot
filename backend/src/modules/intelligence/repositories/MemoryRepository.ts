import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { SetMemoryDTO } from '../domain/IntelligenceSchemas';

export class MemoryRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'ai_memory');
  }

  public async setMemory(userId: string, dto: SetMemoryDTO): Promise<Result<any, AppError>> {
    try {
      const payload = { user_id: userId, category: dto.category, key: dto.key, value: dto.value };
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(payload, { onConflict: 'user_id,category,key' })
        .select()
        .single();
        
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getMemoryByCategory(userId: string, category: string): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('key, value')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('is_active', true);
        
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
