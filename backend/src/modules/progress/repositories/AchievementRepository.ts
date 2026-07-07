import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export class AchievementRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'achievements');
  }

  public async unlockAchievement(userId: string, achievementKey: string): Promise<Result<boolean, AppError>> {
    try {
      // Find the ID of the achievement key
      const { data: achievement, error: findErr } = await this.supabase
        .from('achievements')
        .select('id')
        .eq('key', achievementKey)
        .single();
        
      if (findErr) throw findErr;
      if (!achievement) return ok(false);

      // Try to unlock it
      const { error: insertErr } = await this.supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_id: achievement.id });
        
      // If it fails because of unique constraint, it means already unlocked
      if (insertErr) {
        if (insertErr.code === '23505') return ok(false); // Already unlocked
        throw insertErr;
      }
      
      return ok(true);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getUserAchievements(userId: string): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievements (*)
        `)
        .eq('user_id', userId);
        
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
