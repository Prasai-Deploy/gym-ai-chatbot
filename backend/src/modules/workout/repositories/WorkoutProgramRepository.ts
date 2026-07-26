import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export class WorkoutProgramRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'programs');
  }

  public async publishVersion(programId: string, versionId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from('program_versions')
        .update({ is_published: true })
        .eq('id', versionId)
        .eq('program_id', programId);
      
      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getPublishedPrograms(): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('programs')
        .select(`
          *,
          program_versions!inner(*)
        `)
        .eq('program_versions.is_published', true);

      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
