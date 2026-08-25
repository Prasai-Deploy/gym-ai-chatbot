import React from 'react';
import { WeeklySummary } from '../types/dashboard.types';
import { MetricCard } from '../../../shared';

interface DashboardStatsProps {
  weeklySummary: WeeklySummary | null;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ weeklySummary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <MetricCard 
        label="Total Burned"
        value={`${weeklySummary?.total_calories || 0} kcal`}
        valueColor="text-emerald-500"
      />
      <MetricCard 
        label="Workouts"
        value={weeklySummary?.total_workouts || 0}
        valueColor="text-purple-500"
      />
      <MetricCard 
        label="Avg Hydration"
        value={`${Math.round(weeklySummary?.avg_hydration || 0)}%`}
        valueColor="text-blue-500"
      />
      <MetricCard 
        label="Avg Diet"
        value={`${Math.round(weeklySummary?.avg_diet || 0)}%`}
        valueColor="text-brand-500"
      />
    </div>
  );
};
