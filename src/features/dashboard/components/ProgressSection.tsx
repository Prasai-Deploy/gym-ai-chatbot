import React from 'react';
import { DashboardCharts } from './DashboardCharts';
import { WaterTracker } from './WaterTracker';
import { ChartMetric, WeeklySummary, ChartData } from '../types/dashboard.types';

interface ProgressSectionProps {
  chartMetric: ChartMetric;
  setChartMetric: (metric: ChartMetric) => void;
  isLoading: boolean;
  weeklySummary: WeeklySummary | null;
  currentWater: number;
  waterGoal: number;
  onAddWater: (amount: number) => void;
  onUpdateWaterGoal: (goal: number) => void;
  onRemoveWater: (id: number) => void;
  waterLogs: any[];
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  chartMetric,
  setChartMetric,
  isLoading,
  weeklySummary,
  currentWater,
  waterGoal,
  onAddWater,
  onUpdateWaterGoal,
  onRemoveWater,
  waterLogs
}) => {
  return (
    <div id="nutrition-section" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="card p-6 sm:p-8 md:col-span-2">
        <DashboardCharts 
          chartMetric={chartMetric} 
          setChartMetric={setChartMetric} 
          isLoading={isLoading} 
          weeklySummary={weeklySummary}
        />
      </section>

      <WaterTracker
        currentWater={currentWater}
        waterGoal={waterGoal}
        onAddWater={onAddWater}
        onUpdateGoal={onUpdateWaterGoal}
        onRemoveWater={onRemoveWater}
        logs={waterLogs}
      />
    </div>
  );
};
