import React from 'react';
import { Flame, Dumbbell, Droplets, Activity } from 'lucide-react';
import { ChartMetric, WeeklySummary } from '../types/dashboard.types';
import { DashboardStats } from './DashboardStats';
import { Tabs, Spinner } from '../../../shared';

interface DashboardChartsProps {
  chartMetric: ChartMetric;
  setChartMetric: (metric: ChartMetric) => void;
  isLoading: boolean;
  weeklySummary: WeeklySummary | null;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ chartMetric, setChartMetric, isLoading, weeklySummary }) => {
  const TABS = [
    { id: 'calories_burned', label: 'Calories', icon: <Flame size={14} /> },
    { id: 'workouts_completed', label: 'Workouts', icon: <Dumbbell size={14} /> },
    { id: 'hydration_completion', label: 'Hydration', icon: <Droplets size={14} /> },
    { id: 'exercises_completed', label: 'Activity', icon: <Activity size={14} /> }
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold mb-1 text-text-primary">Weekly Progress</h3>
          <p className="text-sm italic text-text-muted">Visualize your fitness journey</p>
        </div>
        <Tabs 
          tabs={TABS} 
          activeTab={chartMetric} 
          onTabChange={(id) => setChartMetric(id as ChartMetric)} 
        />
      </div>

      <DashboardStats weeklySummary={weeklySummary} />

      <div className="relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 backdrop-blur-[2px] z-10 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" className="text-purple-500" />
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading Analytics...</p>
            </div>
          </div>
        )}
        <div id="chartdiv" className="h-[300px] w-full" />
      </div>
    </>
  );
};
