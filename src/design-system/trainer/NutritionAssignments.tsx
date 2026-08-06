import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface AssignedNutrition {
  id: string;
  clientName: string;
  planName: string;
  targetCalories: number;
  proteinG: number;
}

export interface NutritionAssignmentsProps {
  assignments?: AssignedNutrition[];
  onAssignNew?: () => void;
  className?: string;
}

export const NutritionAssignments: React.FC<NutritionAssignmentsProps> = React.memo(({
  assignments = [
    { id: '1', clientName: 'Marcus Vance', planName: 'High Protein Recomp Diet', targetCalories: 2650, proteinG: 180 },
    { id: '2', clientName: 'Samantha Reed', planName: 'Caloric Deficit Shred Plan', targetCalories: 1850, proteinG: 140 },
  ],
  onAssignNew,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assigned Macro & Diet Plans</span>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-400" />} onClick={onAssignNew}>
          Assign Diet
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {assignments.map((as) => (
          <div key={as.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">{as.clientName}</span>
              <span className="text-[10px] text-slate-400">{as.planName} • {as.targetCalories} kcal</span>
            </div>
            <Badge variant="success" size="sm">{as.proteinG}g Protein</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

NutritionAssignments.displayName = 'NutritionAssignments';
