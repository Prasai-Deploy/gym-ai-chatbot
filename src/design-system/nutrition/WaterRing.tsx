import React from 'react';
import { ProgressRing } from '../components/ProgressRing';

export interface WaterRingProps {
  currentLiters: number;
  targetLiters?: number;
  size?: number;
  className?: string;
}

export const WaterRing: React.FC<WaterRingProps> = React.memo(({
  currentLiters,
  targetLiters = 3.5,
  size = 110,
  className,
}) => {
  const percentage = Math.min(Math.round((currentLiters / targetLiters) * 100), 100);

  return (
    <ProgressRing
      value={percentage}
      size={size}
      strokeWidth={10}
      variant="ai"
      label={`${currentLiters}L`}
      className={className}
    />
  );
});

WaterRing.displayName = 'WaterRing';
