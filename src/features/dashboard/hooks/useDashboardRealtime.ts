import { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dashboardService } from '../services/dashboard.service';

interface UseDashboardRealtimeProps {
  fetchProgress: () => void;
  fetchWeeklyProgress: () => void;
  fetchActivities: () => void;
  fetchTodayWater: () => void;
  fetchDashboardData: () => void;
  fetchUser: () => void;
  fetchPlans: () => void;
}

export function useDashboardRealtime({
  fetchProgress,
  fetchWeeklyProgress,
  fetchActivities,
  fetchTodayWater,
  fetchDashboardData,
  fetchUser,
  fetchPlans
}: UseDashboardRealtimeProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (user && (user as any).is_admin) {
      window.location.replace('/admin');
      return;
    }
    if (!user) return;

    const es = new EventSource('/api/stream');

    es.addEventListener('dashboard-update', (e: MessageEvent) => {
      try {
        const flags = JSON.parse(e.data);
        if (flags.progress || flags.activity) {
          fetchProgress();
          fetchWeeklyProgress();
          fetchActivities();
        }
        if (flags.hydration) {
          fetchTodayWater();
          fetchDashboardData();
        }
        if (flags.weight) {
          fetchDashboardData();
        }
        if (flags.macros || flags.userProfile) {
          fetchUser();
        }
        if (flags.plans) {
          fetchPlans();
          fetchTodayWater();
          fetchUser();
        }
      } catch {}
    });

    es.onerror = () => {
      // SSE disconnected — browser auto-reconnects; silent
    };

    // Fallback polling at 30s (handles tabs that lose SSE)
    const fallbackPoll = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      es.close();
      clearInterval(fallbackPoll);
    };
  }, [
    user,
    fetchProgress,
    fetchWeeklyProgress,
    fetchActivities,
    fetchTodayWater,
    fetchDashboardData,
    fetchUser,
    fetchPlans
  ]);
}
