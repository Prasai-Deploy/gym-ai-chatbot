import React from 'react';
import { motion } from 'motion/react';
import { Progress } from '../components/Progress';
import { Utensils, Flame } from '../icons';
import { cn } from '../tokens';

export interface MinimalNutritionHeroProps {
  nutritionScore?: number; // 0 - 100
  caloriesLogged?: number;
  caloriesTarget?: number;
  proteinLoggedGrams?: number;
  proteinTargetGrams?: number;
  headline?: string;
  className?: string;
}

export const MinimalNutritionHero: React.FC<MinimalNutritionHeroProps> = React.memo(({
  nutritionScore = 88,
  caloriesLogged = 2240,
  caloriesTarget = 2650,
  proteinLoggedGrams = 148,
  proteinTargetGrams = 180,
  headline = "You're on track today.",
  className,
}) => {
  // Circular arc gauge parameters
  const size = 180;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(nutritionScore, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const caloriePct = Math.min(Math.round((caloriesLogged / (caloriesTarget || 1)) * 100), 100);
  const proteinPct = Math.min(Math.round((proteinLoggedGrams / (proteinTargetGrams || 1)) * 100), 100);

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-6 select-none shadow-sm',
        className
      )}
    >
      {/* Central Circular Nutrition Score Arc */}
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Score Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Display Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl sm:text-5xl font-extrabold text-white font-display tracking-tight leading-none tabular-nums">
            {nutritionScore}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-1 font-sans">
            Nutrition Score
          </span>
        </div>
      </div>

      {/* Main Headline */}
      <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug max-w-sm">
        {headline}
      </p>

      {/* Two Supporting Primary Bars: Calories & Protein */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md pt-5 border-t border-white/[0.06] text-left">
        {/* Calories */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Calories</span>
            <span className="text-white font-bold tabular-nums font-display">
              {caloriesLogged.toLocaleString()} <span className="text-slate-400 font-normal font-sans">/ {caloriesTarget.toLocaleString()} kcal</span>
            </span>
          </div>
          <Progress value={caloriesLogged} max={caloriesTarget} variant="success" size="sm" />
        </div>

        {/* Protein */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Protein</span>
            <span className="text-emerald-400 font-bold tabular-nums font-display">
              {proteinLoggedGrams}g <span className="text-slate-400 font-normal font-sans">/ {proteinTargetGrams}g</span>
            </span>
          </div>
          <Progress value={proteinLoggedGrams} max={proteinTargetGrams} variant="primary" size="sm" />
        </div>
      </div>
    </div>
  );
});

MinimalNutritionHero.displayName = 'MinimalNutritionHero';
