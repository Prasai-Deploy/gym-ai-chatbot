import { useState, useCallback } from 'react';
import { ActivityItem } from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';

export function useActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const fetchActivities = useCallback(async () => {
    const acts = await dashboardService.fetchActivities();
    setActivities(acts);
  }, []);

  return { activities, setActivities, fetchActivities };
}
