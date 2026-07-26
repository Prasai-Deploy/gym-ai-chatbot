import React from 'react';
import { httpClient } from '../../../api/httpClient';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboardCharts } from '../hooks/useDashboardCharts';
import { useWorkoutSummary } from '../hooks/useWorkoutSummary';
import { useNutritionSummary } from '../hooks/useNutritionSummary';

import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardHome } from '../components/DashboardHome';
import { WorkoutSection } from '../components/WorkoutSection';
import { ProgressSection } from '../components/ProgressSection';
import { NutritionSection } from '../components/NutritionSection';
import { ActivitySection } from '../components/ActivitySection';
import { BottomNavigation } from '../components/BottomNavigation';
import { FloatingChatButton } from '../components/FloatingChatButton';
import { DashboardDialogs } from '../components/DashboardDialogs';

import { useTheme } from '../../../hooks/useTheme';
import { MacroTracker } from '../../../components/MacroTracker';
import { CaloriesRing } from '../../../components/CaloriesRing';
import { InstallPrompt } from '../../../components/InstallPrompt';
import { OfflineBanner } from '../../../components/OfflineBanner';
import { Dumbbell, Utensils, Droplets, Bot, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  useTheme(); // Initialize theme from localStorage on load

  const dashboard = useDashboard();
  const { chartMetric, setChartMetric } = useDashboardCharts(dashboard.weeklyChartData);
  const { totalProtein, totalCarbs, totalFats, totalCalories, totalBurned, totalWater } = useWorkoutSummary(dashboard.progress, dashboard.dashboardData);
  const { handleAddWater, handleUpdateWaterGoal, handleRemoveWater } = useNutritionSummary({
    setWaterSummary: dashboard.setWaterSummary,
    setWeeklyChartData: dashboard.setWeeklyChartData,
    fetchTodayWater: dashboard.fetchTodayWater,
    fetchDashboardData: dashboard.fetchDashboardData,
    fetchWeeklyProgress: dashboard.fetchWeeklyProgress
  });

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    const { format } = await import('date-fns');
    const { queueRequest } = await import('../../../services/offlineStorage');
    const payload = {
      ...dashboard.formData,
      calories: Number(dashboard.formData.calories) || 0,
      protein: Number(dashboard.formData.protein) || 0,
      carbs: Number(dashboard.formData.carbs) || 0,
      fats: Number(dashboard.formData.fats) || 0,
      water: Number(dashboard.formData.water) || 0,
      date: format(new Date(), 'MMM dd')
    };
    
    // Optimistic UI for chart
    const today = new Date().toISOString().split('T')[0];
    dashboard.setWeeklyChartData((prev: any[]) => prev.map(d => 
      d.date.includes(today) ? { ...d, calories_burned: (d.calories_burned || 0) + (payload.calories || 0) } : d
    ));

    try {
      await httpClient.post('/intelligence/nutrition/log', {
        calories: payload.calories,
        protein_g: payload.protein,
        carbs_g: payload.carbs,
        fat_g: payload.fats,
        water_ml: payload.water * 1000,
        notes: payload.workout_name || undefined,
      });
      dashboard.fetchWeeklyProgress();
    } catch {
      await queueRequest('/api/v1/intelligence/nutrition/log', 'POST', payload);
    }
    dashboard.setFormData({ workout_name: '', calories: '', protein: '', carbs: '', fats: '', water: '' });
    dashboard.setShowForm(false);
    dashboard.fetchProgress();
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const { format } = await import('date-fns');
    const { dashboardService } = await import('../services/dashboard.service');
    await dashboardService.savePlan({
      ...dashboard.planForm,
      date: format(new Date(), 'MMM dd')
    });
    dashboard.setPlanForm({ workout_plan: '', diet_plan: '' });
    dashboard.setShowPlanForm(false);
    dashboard.fetchPlans();
  };

  const handleSaveProfile = async () => {
    if (!dashboard.editName.trim()) return;
    try {
      const res = await httpClient.patch('/identity/profile', { full_name: dashboard.editName }) as any;
      if (res?.data) {
        dashboard.setUser((prev) => prev ? { ...prev, name: dashboard.editName } : prev);
      }
    } catch (e) {
      console.error(e);
    } finally {
      dashboard.setIsEditingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans pb-32 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <DashboardHeader 
        user={dashboard.user} 
        onShowProfile={() => dashboard.setShowProfile(true)} 
        onLogout={dashboard.handleLogout} 
      />

      <OfflineBanner />
      <InstallPrompt />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 relative z-10">
        <DashboardHome user={dashboard.user} />

        {/* Quick Action Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => dashboard.setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 text-slate-200 text-xs font-bold transition-all shrink-0 hover:scale-105"
          >
            <Dumbbell className="w-4 h-4 text-orange-400" /> Log Workout
          </button>
          <button 
            onClick={() => dashboard.setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 text-slate-200 text-xs font-bold transition-all shrink-0 hover:scale-105"
          >
            <Utensils className="w-4 h-4 text-amber-400" /> Log Nutrition
          </button>
          <button 
            onClick={() => handleAddWater(250)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-xs font-bold transition-all shrink-0 hover:scale-105"
          >
            <Droplets className="w-4 h-4 text-cyan-400" /> +250ml Water
          </button>
          <button 
            onClick={() => dashboard.setChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all shrink-0 hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" /> AI Coach
          </button>
        </div>

        {/* Primary Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CaloriesRing burned={totalCalories} goal={dashboard.user?.calorie_goal || 2000} />
          <MacroTracker 
            protein={totalProtein} carbs={totalCarbs} fats={totalFats}
            proteinGoal={dashboard.user?.protein_goal} carbsGoal={dashboard.user?.carb_goal} fatsGoal={dashboard.user?.fat_goal}
          />
        </div>

        <WorkoutSection onLogActivity={() => dashboard.setShowForm(true)} />
        
        <ProgressSection 
          chartMetric={chartMetric} 
          setChartMetric={setChartMetric} 
          isLoading={dashboard.weeklyChartData.length === 0}
          weeklySummary={dashboard.weeklySummary}
          currentWater={dashboard.waterSummary?.total_consumed || 0}
          waterGoal={dashboard.waterSummary?.daily_goal || dashboard.user?.water_goal || 2000}
          onAddWater={handleAddWater}
          onUpdateWaterGoal={handleUpdateWaterGoal}
          onRemoveWater={handleRemoveWater}
          waterLogs={dashboard.waterLogs}
        />

        <NutritionSection 
          dashboardData={dashboard.dashboardData} 
          dailyPlans={dashboard.dailyPlans} 
          onShowHistory={() => dashboard.setShowHistory(true)}
          onUpdatePlan={() => dashboard.setShowPlanForm(true)}
        />

        <ActivitySection activities={dashboard.activities} />
      </main>

      <BottomNavigation 
        activeTab={dashboard.activeTab} 
        onTabChange={dashboard.handleTabChange} 
        onLogPress={() => dashboard.setShowForm(true)} 
      />

      <FloatingChatButton 
        chatOpen={dashboard.chatOpen}
        setChatOpen={dashboard.setChatOpen}
      />

      <DashboardDialogs 
        showForm={dashboard.showForm}
        setShowForm={dashboard.setShowForm}
        formData={dashboard.formData}
        setFormData={dashboard.setFormData}
        onSubmitProgress={handleSubmitProgress}
        
        showPlanForm={dashboard.showPlanForm}
        setShowPlanForm={dashboard.setShowPlanForm}
        planForm={dashboard.planForm}
        setPlanForm={dashboard.setPlanForm}
        onSavePlan={handleSavePlan}
        
        showHistory={dashboard.showHistory}
        setShowHistory={dashboard.setShowHistory}
        planHistory={dashboard.planHistory}
        
        showProfile={dashboard.showProfile}
        setShowProfile={dashboard.setShowProfile}
        user={dashboard.user}
        isEditingProfile={dashboard.isEditingProfile}
        setIsEditingProfile={dashboard.setIsEditingProfile}
        editName={dashboard.editName}
        setEditName={dashboard.setEditName}
        onSaveProfile={handleSaveProfile}
        onLogout={dashboard.handleLogout}
      />
    </div>
  );
}
