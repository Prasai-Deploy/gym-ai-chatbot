import React, { useState } from 'react';
import { Card } from '../components/Card';
import { ProgressRing } from '../components/ProgressRing';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface HydrationCardProps {
  initialLiters?: number;
  targetLiters?: number;
  className?: string;
}

export const HydrationCard: React.FC<HydrationCardProps> = React.memo(({
  initialLiters = 2.2,
  targetLiters = 3.5,
  className,
}) => {
  const [liters, setLiters] = useState(initialLiters);
  const percentage = Math.min(Math.round((liters / targetLiters) * 100), 100);

  const handleAddWater = () => {
    setLiters((prev) => Math.min(Number((prev + 0.25).toFixed(2)), targetLiters));
  };

  return (
    <Card variant="default" className={`p-6 flex items-center justify-between gap-4 select-none ${className}`}>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hydration Tracker</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{liters}</span>
          <span className="text-xs text-slate-400">/ {targetLiters} Liters</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
          onClick={handleAddWater}
          className="mt-1"
        >
          +250ml Water
        </Button>
      </div>

      <ProgressRing value={percentage} size={85} strokeWidth={8} variant="ai" label="Hydrated" />
    </Card>
  );
});

HydrationCard.displayName = 'HydrationCard';
