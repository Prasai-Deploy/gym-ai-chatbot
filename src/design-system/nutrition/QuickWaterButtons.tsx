import React from 'react';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface QuickWaterButtonsProps {
  onAddWater: (amountMl: number) => void;
  className?: string;
}

export const QuickWaterButtons: React.FC<QuickWaterButtonsProps> = React.memo(({
  onAddWater,
  className,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
        onClick={() => onAddWater(250)}
        className="flex-1"
      >
        +250ml
      </Button>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
        onClick={() => onAddWater(500)}
        className="flex-1"
      >
        +500ml
      </Button>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
        onClick={() => onAddWater(750)}
        className="flex-1"
      >
        +750ml
      </Button>
    </div>
  );
});

QuickWaterButtons.displayName = 'QuickWaterButtons';
