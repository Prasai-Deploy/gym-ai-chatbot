import React from 'react';
import { MinimalNutritionHero } from './MinimalNutritionHero';
import { ChronologicalMealList } from './ChronologicalMealList';
import { MinimalHydrationSection } from './MinimalHydrationSection';
import { NutritionTrinityCard } from './NutritionTrinityCard';
import { SecondaryMacroDetails } from './SecondaryMacroDetails';
import { useNutritionData } from '../../hooks/useStrivaApi';
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
  const { data: nutritionData, logWater } = useNutritionData();

  const caloriesLogged = nutritionData?.consumedCalories || 2240;
  const caloriesTarget = nutritionData?.targetCalories || 2650;
  const proteinLogged = nutritionData?.proteinG || 148;
  const carbsLogged = nutritionData?.carbsG || 210;
  const fatLogged = nutritionData?.fatsG || 62;
  const hydrationLiters = nutritionData?.hydrationMl ? Math.round((nutritionData.hydrationMl / 1000) * 10) / 10 : 1.8;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8', className)}>
      {/* 1. Header Identity */}
      <div className="flex flex-col gap-0.5 select-none">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          Nutrition & Fuel
        </h1>
      </div>

      {/* 2. Primary Hero: Nutrition Score & Calories/Protein Progress */}
      <MinimalNutritionHero
        nutritionScore={88}
        caloriesLogged={caloriesLogged}
        caloriesTarget={caloriesTarget}
        proteinLoggedGrams={proteinLogged}
        proteinTargetGrams={180}
        headline="You're on track today."
      />

      {/* 3. Today's Chronological Meals */}
      <ChronologicalMealList />

      {/* 4. Hydration & Trinity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MinimalHydrationSection
          initialLiters={hydrationLiters}
          targetLiters={2.5}
          onLogWater={(ml) => logWater?.(ml)}
        />
        <div className="flex items-center">
          <NutritionTrinityCard
            insightText="You're 32g short of your protein target. A protein-rich dinner will keep you optimal."
            onAskTrinity={() => onNavigateCoach('Help me optimize my dinner for my protein goal')}
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
      />
    </div>
  );
});

NutritionLayout.displayName = 'NutritionLayout';
