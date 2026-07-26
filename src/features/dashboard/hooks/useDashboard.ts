import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { dashboardService } from '../services/dashboard.service';
import { ProgressData, DailyPlan, WaterSummary, ActivityItem, ChartData, WeeklySummary, DashboardData } from '../types/dashboard.types';
import { useDashboardRealtime } from './useDashboardRealtime';
import { useActivity } from './useActivity';
import { format } from 'date-fns';
import { cacheUser, getCachedUser, cacheProgress, getCachedProgress, cachePlans, getCachedPlans, queueRequest, replayQueue } from '../../../services/offlineStorage';
import { authApi } from '../../../api/authApi';

export function useDashboard() {
  const { user, setUser, logout } = useAuth();
  const { activities, setActivities, fetchActivities } = useActivity();
  
  // Data States
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
  const [planHistory, setPlanHistory] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [waterSummary, setWaterSummary] = useState<WaterSummary | null>(null);
  
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  
  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'model', content: "Welcome to STRIVA. How can I assist with your fitness goals or macros today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form States
  const [planForm, setPlanForm] = useState({ workout_plan: '', diet_plan: '' });
  const [formData, setFormData] = useState<{
    workout_name: string;
    calories: number | '';
    protein: number | '';
    carbs: number | '';
    fats: number | '';
    water: number | '';
  }>({
    workout_name: '', calories: '', protein: '', carbs: '', fats: '', water: ''
  });

  // Fetchers
  const fetchUser = useCallback(async () => {
    try {
      const res = await authApi.getMe() as any;
      // v2 /identity/me returns { success, data: { profile, fitness, preferences } }
      const profile = res?.data?.profile ?? res?.data ?? res;
      if (profile) {
        const mappedUser = {
          ...profile,
          id: profile.id ?? profile.auth_id,
          name: profile.full_name ?? profile.name ?? 'User',
          email: profile.email ?? '',
          avatar: profile.avatar_url ?? '',
        };
        setUser(mappedUser);
        await cacheUser(mappedUser);
        fetchProgress();
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
      const cached = await getCachedUser();
      if (cached) {
        setUser(cached);
        const cachedProgress = await getCachedProgress();
        if (cachedProgress) setProgress(cachedProgress);
        const cachedPlans = await getCachedPlans();
        if (cachedPlans) setDailyPlans(cachedPlans);
      }
    }
  }, [setUser]);

  const fetchWeeklyProgress = useCallback(async () => {
    const { chartData, summary } = await dashboardService.fetchWeeklyProgress();
    setWeeklyChartData(chartData);
    setWeeklySummary(summary);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const data = await dashboardService.fetchDashboardData();
    if (data) {
      setDashboardData(data);
      if (data.today_stats) {
        setWaterSummary({
          total_consumed: data.today_stats.water_ml,
          daily_goal: user?.water_goal || 2000,
          completion_percentage: Math.min(100, Math.round((data.today_stats.water_ml / (user?.water_goal || 2000)) * 100))
        });
      }
      if (data.recent_workouts) {
        setProgress(data.recent_workouts);
      }
    }
  }, [user?.water_goal]);

  const fetchProgress = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchTodayWater = useCallback(async () => {
    const res = await dashboardService.fetchTodayWater();
    if (res) {
      setWaterSummary(res.summary);
      setWaterLogs(res.logs);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const plan = await dashboardService.fetchLatestPlan();
      if (plan) {
        setDailyPlans([{
          id: plan.id,
          date: format(new Date(plan.created_at), 'MMM dd'),
          workout_plan: plan.workout_title || 'Workout',
          diet_plan: plan.diet_title || 'Diet',
          completed: false,
          ...plan
        }]);
      }
      const history = await dashboardService.fetchPlanHistory();
      setPlanHistory(history);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Realtime hook
  useDashboardRealtime({
    fetchProgress,
    fetchWeeklyProgress,
    fetchActivities,
    fetchTodayWater,
    fetchDashboardData,
    fetchUser,
    fetchPlans
  });

  // Init
  useEffect(() => {
    fetchUser();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);

    const handleOnline = async () => {
      const replayed = await replayQueue();
      if (replayed > 0) {
        fetchProgress();
        fetchPlans();
      }
    };
    window.addEventListener('online', handleOnline);

    const handleWorkoutCompleted = () => {
      fetchProgress();
      fetchPlans();
      fetchWeeklyProgress();
      fetchActivities();
    };
    window.addEventListener('workout-completed', handleWorkoutCompleted);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('workout-completed', handleWorkoutCompleted);
    };
  }, [fetchUser, fetchProgress, fetchPlans, fetchWeeklyProgress, fetchActivities]);

  useEffect(() => {
    fetchActivities();
    fetchWeeklyProgress();
  }, [user, fetchActivities, fetchWeeklyProgress]);

  // Handlers
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'coach') {
      setChatOpen(true);
    } else {
      setChatOpen(false);
      const sectionMap: Record<string, string> = {
        home: 'dashboard-top',
        workouts: 'workout-section',
        nutrition: 'nutrition-section',
      };
      const targetId = sectionMap[tab];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return {
    user, setUser, handleLogout,
    progress, setProgress,
    dailyPlans, setDailyPlans,
    planHistory, setPlanHistory,
    dashboardData, setDashboardData,
    waterLogs, setWaterLogs,
    waterSummary, setWaterSummary,
    activities, setActivities,
    weeklyChartData, setWeeklyChartData,
    weeklySummary, setWeeklySummary,
    activeTab, setActiveTab, handleTabChange,
    showForm, setShowForm, formData, setFormData,
    showPlanForm, setShowPlanForm, planForm, setPlanForm,
    showHistory, setShowHistory,
    showProfile, setShowProfile,
    isEditingProfile, setIsEditingProfile,
    editName, setEditName,
    chatOpen, setChatOpen,
    messages, setMessages,
    input, setInput,
    isTyping, setIsTyping,
    isListening, setIsListening,
    recognitionRef, messagesEndRef, textareaRef,
    fetchUser, fetchProgress, fetchWeeklyProgress, fetchActivities, fetchTodayWater, fetchDashboardData, fetchPlans
  };
}
