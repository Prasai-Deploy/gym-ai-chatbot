import React from 'react';
import { NutritionHero } from './NutritionHero';
import { MacroRings } from './MacroRings';
import { MealTimeline } from './MealTimeline';
import { MealRecommendation } from './MealRecommendation';
import { ShoppingList } from './ShoppingList';
import { HydrationCard } from './HydrationCard';
import { RecoveryCard } from './RecoveryCard';
import { NutritionInsights } from './NutritionInsights';
import { CoachNutritionCard } from './CoachNutritionCard';
import { NutritionSummary } from './NutritionSummary';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface NutritionLayoutProps {
  userName?: string;
  onNavigateCoach?: (prompt?: string) => void;
  className?: string;
}

export const NutritionLayout: React.FC<NutritionLayoutProps> = React.memo(({
  userName = 'Alex',
  onNavigateCoach = (prompt) => console.log('Navigate coach with prompt:', prompt),
  className,
}) => {
  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <NutritionHero userName={userName} nutritionScore={88} readinessScore={88} />

      {/* 2. Macro Rings Overview */}
      <MacroRings />

      {/* 3. Meal Recommendation & Hydration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MealRecommendation className="lg:col-span-2" />
        <HydrationCard initialLiters={2.25} targetLiters={3.5} />
      </div>

      {/* 4. Meal Timeline Stream & Shopping List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MealTimeline className="lg:col-span-2" />
        <ShoppingList />
      </div>

      {/* 5. WHOOP/Oura Recovery Suite & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecoveryCard className="lg:col-span-2" />
        <CoachNutritionCard onAskDietAdvice={onNavigateCoach} />
      </div>

      {/* 6. AI Micronutrient Insights & End of Day Summary */}
      <NutritionInsights />
      <NutritionSummary />
    </PageContainer>
  );
});

NutritionLayout.displayName = 'NutritionLayout';
