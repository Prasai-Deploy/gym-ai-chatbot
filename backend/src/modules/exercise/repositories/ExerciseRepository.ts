import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { IExerciseRepository } from './IExerciseRepository';
import { Exercise, SearchExerciseQuery } from '../domain/ExerciseSchemas';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { logger } from '@logger/index';

export class ExerciseRepository extends BaseRepository<Exercise> implements IExerciseRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'exercises');
  }

  public async search(query: SearchExerciseQuery): Promise<Result<Exercise[], AppError>> {
    try {
      let req = this.supabase
        .from('exercises')
        .select(`
          *,
          exercise_categories(name),
          movement_patterns(name),
          exercise_types(name),
          exercise_equipment!inner(equipment_id),
          exercise_muscles!inner(muscle_group_id, is_primary)
        `);

      if (query.search) {
        req = req.ilike('name', `%${query.search}%`);
      }
      if (query.category) {
        req = req.eq('category_id', query.category);
      }
      if (query.difficulty) {
        req = req.eq('difficulty', query.difficulty);
      }
      if (query.type) {
        req = req.eq('exercise_type_id', query.type);
      }
      if (query.pattern) {
        req = req.eq('movement_pattern_id', query.pattern);
      }
      if (query.muscle) {
        req = req.eq('exercise_muscles.muscle_group_id', query.muscle);
      }
      if (query.equipment) {
        req = req.eq('exercise_equipment.equipment_id', query.equipment);
      }

      const { data, error } = await req;
      
      if (error) throw error;
      
      return ok(data as unknown as Exercise[]);
    } catch (err: any) {
      logger.error({ err, query }, 'Error in ExerciseRepository.search');
      return fail(new AppError(err.message, 500));
    }
  }

  public async findCategories(): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase.from('exercise_categories').select('*');
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async findMuscleGroups(): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase.from('muscle_groups').select('*');
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async findEquipment(): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase.from('equipment').select('*');
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
