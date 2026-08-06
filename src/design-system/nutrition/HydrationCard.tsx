import React, { useState } from 'react';
import { Card } from '../components/Card';
import { WaterRing } from './WaterRing';
import { QuickWaterButtons } from './QuickWaterButtons';
import { Badge } from '../components/Badge';

export interface HydrationCardProps {
  initialLiters?: number;
  targetLiters?: number;
  className?: string;
}

export const HydrationCard: React.FC<HydrationCardProps> = React.memo(({
  initialLiters = 2.25,
  targetLiters = 3.5,
  className,
}) => {
  const [liters, setLiters] = useState(initialLiters);

  const handleAddWater = (ml: number) => {
    setLiters((prev) => Math.min(Number((prev + ml / 1000).toFixed(2)), targetLiters));
  };

  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hydration Engine</span>
        <Badge variant="primary" size="sm">
          {Math.round((liters / targetLiters) * 100)}% Goal
        </Badge>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400">Total Consumption</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{liters}</span>
            <span className="text-xs text-slate-400">/ {targetLiters} Liters</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold mt-1">Optimal Cellular Hydration</span>
        </div>

        <WaterRing currentLiters={liters} targetLiters={targetLiters} />
      </div>

      <QuickWaterButtons onAddWater={handleAddWater} />
    </Card>
  );
});

HydrationCard.displayName = 'HydrationCard';
