import React, { useState } from 'react';
import { MinimalNutritionHero } from './MinimalNutritionHero';
import { ChronologicalMealList, MealItem } from './ChronologicalMealList';
import { MinimalHydrationSection } from './MinimalHydrationSection';
import { NutritionTrinityCard } from './NutritionTrinityCard';
import { SecondaryMacroDetails } from './SecondaryMacroDetails';
import { LogMealModal } from './LogMealModal';
import { useNutritionData } from '../../hooks/useStrivaApi';
import { httpClient } from '../../api/httpClient';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from '../icons';
import { cn } from '../tokens';

export interface NutritionLayoutProps {
  userName?: string;
  onNavigateCoach?: (prompt?: string) => void;
  className?: string;
}

export const NutritionLayout: React.FC<NutritionLayoutProps> = React.memo(({
  userName = 'Athlete',
  onNavigateCoach = () => console.log('Open Coach'),
  className,
}) => {
  const queryClient = useQueryClient();
  const { data: rawData, isError, error, logWater } = useNutritionData();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [logMealError, setLogMealError] = useState<string | null>(null);

  // Check if live DB blocker is active
  const isTelemetryOffline = isError || !rawData;
  const dbErrorMessage = error
    ? ((error as any)?.response?.data?.message || (error as any)?.message || 'Database error querying nutrition logs: table not found')
    : null;

  const nutritionData = rawData;
  const caloriesLogged = nutritionData?.totalCalories ?? (isTelemetryOffline ? undefined : 0);
  const caloriesTarget = 2650;
  const proteinLogged = nutritionData?.totalProtein ?? (isTelemetryOffline ? undefined : 0);
  const carbsLogged = nutritionData?.totalCarbs ?? (isTelemetryOffline ? undefined : 0);
  const fatLogged = nutritionData?.totalFats ?? (isTelemetryOffline ? undefined : 0);
  const hydrationLiters = nutritionData?.totalWaterMl ? Math.round((nutritionData.totalWaterMl / 1000) * 10) / 10 : (isTelemetryOffline ? undefined : 0);

  // Map API meals if any
  const mealsList: MealItem[] = (nutritionData?.meals || []).map((m: any) => ({
    id: m.id,
    name: m.food_name || m.name || 'Meal',
    description: m.meal_type ? `${m.meal_type.toUpperCase()} · ${m.calories} kcal` : undefined,
    calories: m.calories || 0,
    proteinGrams: m.protein_g,
    carbsGrams: m.carbs_g,
    fatsGrams: m.fats_g,
    completed: true,
    timeSlot: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
  }));

  const handleSaveMeal = async (mealData: {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => {
    setIsSavingMeal(true);
    setLogMealError(null);
    try {
      await httpClient.post('/nutrition/meals', {
        food_name: mealData.name,
        meal_type: mealData.meal_type,
        calories: mealData.calories,
        protein_g: mealData.protein_g,
        carbs_g: mealData.carbs_g,
        fats_g: mealData.fats_g,
      });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
      setIsLogModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Database execution failed: table public.v2_nutrition_logs missing';
      setLogMealError(`API Error: ${msg}`);
    } finally {
      setIsSavingMeal(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8', className)}>
      {/* 1. Header Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
            {formattedDate}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Nutrition & Fuel
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setLogMealError(null);
            setIsLogModalOpen(true);
          }}
          className="self-start sm:self-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-extrabold shadow-md shadow-lime-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>+ Log Meal</span>
        </button>
      </div>

      {/* Honest Alert Banner in Plain Language */}
      {isTelemetryOffline && (
        <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 flex items-start gap-3 select-none">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-amber-300 font-sans uppercase tracking-wider">
              Meal & Hydration Tracking Offline
            </span>
            <p className="text-slate-300 leading-relaxed font-sans">
              We cannot load your meals or hydration history right now. Your workout data and other features are unaffected.
            </p>
          </div>
        </div>
      )}

      {/* 2. Primary Hero: Nutrition Score & Calories/Protein Progress */}
      <MinimalNutritionHero
        nutritionScore={isTelemetryOffline ? undefined : 88}
        caloriesLogged={caloriesLogged}
        caloriesTarget={caloriesTarget}
        proteinLoggedGrams={proteinLogged}
        proteinTargetGrams={180}
        isTelemetryOffline={isTelemetryOffline}
        headline={isTelemetryOffline ? 'Meal and hydration data is currently unavailable.' : "You're on track today."}
      />

      {/* 3. Today's Chronological Meals */}
      <ChronologicalMealList
        meals={mealsList}
        isTelemetryOffline={isTelemetryOffline}
        onOpenLogMeal={() => {
          setLogMealError(null);
          setIsLogModalOpen(true);
        }}
      />

      {/* 4. Hydration & TRINETRA Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MinimalHydrationSection
          initialLiters={hydrationLiters}
          targetLiters={2.5}
          isTelemetryOffline={isTelemetryOffline}
          onLogWater={(ml) => logWater?.(ml)}
        />
        <div className="flex items-center">
          <NutritionTrinityCard
            insightText={isTelemetryOffline ? "Telemetry offline. Configure meals and water tracking to receive TRINETRA fuel recommendations." : "You're 32g short of your protein target. A protein-rich dinner will keep you optimal."}
            onAskTrinity={() => onNavigateCoach('Help me optimize my nutrition and meal planning')}
          />
        </div>
      </div>

      {/* 5. Secondary Macronutrient Details */}
      <SecondaryMacroDetails
        proteinGrams={proteinLogged}
        proteinTarget={180}
        carbsGrams={carbsLogged}
        carbsTarget={280}
        fatGrams={fatLogged}
        fatTarget={75}
        isTelemetryOffline={isTelemetryOffline}
      />

      {/* Log Meal Interactive Modal */}
      <LogMealModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSaveMeal={handleSaveMeal}
        isSaving={isSavingMeal}
        error={logMealError}
      />
    </div>
  );
});

NutritionLayout.displayName = 'NutritionLayout';
