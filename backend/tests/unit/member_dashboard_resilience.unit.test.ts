import { describe, it, expect, vi } from 'vitest';
import { NutritionRepository } from '../../src/modules/nutrition/repositories/NutritionRepository';
import { NutritionService } from '../../src/modules/nutrition/services/NutritionService';

describe('Member Dashboard Resilience — NutritionRepository & NutritionService', () => {
  it('returns failure and does not silently fake zero nutrition when table is missing (PGRST205)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST205',
            message: "Could not find the table 'public.v2_nutrition_logs' in the schema cache",
          },
        }),
      }),
    } as any;

    const repo = new NutritionRepository(mockSupabase);
    const result = await repo.getDailyLogs('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', '2026-10-10');

    // Missing required table must fail, not be silently swallowed as ok([])
    expect(result.isFailure()).toBe(true);
    if (result.isFailure()) {
      expect(result.error.statusCode).toBe(500);
      expect(result.error.message).toContain('Database error querying nutrition logs');
    }
  });

  it('fails observably when water_logs has schema type conversion error (22P02)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '22P02',
            message: 'invalid input syntax for type integer: "a1bf8b11-e2c7-4f7f-9d36-5af53418e20b"',
          },
        }),
      }),
    } as any;

    const repo = new NutritionRepository(mockSupabase);
    const result = await repo.getWaterLogs('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', '2026-10-10');

    // Schema type mismatch must be observable as failure, not swallowed
    expect(result.isFailure()).toBe(true);
    if (result.isFailure()) {
      expect(result.error.statusCode).toBe(500);
      expect(result.error.message).toContain('Hydration query failed');
    }
  });

  it('produces a legitimate 0-total summary on valid empty nutrition history', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [], // Legitimate existing table with 0 rows logged today
            error: null,
          }),
        };
      }),
    } as any;

    const repo = new NutritionRepository(mockSupabase);
    const service = new NutritionService(repo);
    const result = await service.getDailySummary('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', '2026-10-10');

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value.date).toBe('2026-10-10');
      expect(result.value.totalCalories).toBe(0);
      expect(result.value.totalProtein).toBe(0);
      expect(result.value.totalWaterMl).toBe(0);
      expect(result.value.meals).toEqual([]);
    }
  });

  it('safely tolerates optional hydration failure while preserving valid meal summary', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'v2_nutrition_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'm-1', meal_type: 'lunch', food_name: 'Grilled Salmon', calories: 450, protein_g: 40, carbs_g: 0, fats_g: 22 },
              ],
              error: null,
            }),
          };
        }
        if (table === 'water_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '22P02', message: 'invalid input syntax for type integer' },
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }),
    } as any;

    const repo = new NutritionRepository(mockSupabase);
    const service = new NutritionService(repo);
    const result = await service.getDailySummary('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b', '2026-10-10');

    expect(result.isSuccess()).toBe(true);
    if (result.isSuccess()) {
      expect(result.value.totalCalories).toBe(450);
      expect(result.value.totalProtein).toBe(40);
      expect(result.value.totalWaterMl).toBe(0); // Optional hydration defaulted to 0
      expect(result.value.meals.length).toBe(1);
    }
  });
});
