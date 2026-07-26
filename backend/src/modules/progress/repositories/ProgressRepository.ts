import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { ProgressStatistics } from '../domain/ProgressSchemas';

export class ProgressRepository extends BaseRepository<ProgressStatistics> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'progress_statistics');
  }

  public async getStatsByUserId(userId: string): Promise<Result<ProgressStatistics | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return ok(data as ProgressStatistics | null);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async upsertStats(userId: string, updates: Partial<ProgressStatistics>): Promise<Result<ProgressStatistics, AppError>> {
    try {
      const payload = { ...updates, user_id: userId };
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();
        
      if (error) throw error;
      return ok(data as ProgressStatistics);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
