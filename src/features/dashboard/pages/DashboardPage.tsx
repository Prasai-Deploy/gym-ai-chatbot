import React from 'react';
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

import { ThemeToggle } from '../../../components/ThemeToggle';
import { useTheme } from '../../../hooks/useTheme';
import { MacroTracker } from '../../../components/MacroTracker';
import { CaloriesRing } from '../../../components/CaloriesRing';
import { InstallPrompt } from '../../../components/InstallPrompt';
import { OfflineBanner } from '../../../components/OfflineBanner';
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
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      dashboard.fetchWeeklyProgress();
    } catch {
      await queueRequest('/api/progress', 'POST', payload);
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
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dashboard.editName })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        dashboard.setUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      dashboard.setIsEditingProfile(false);
    }
  };



  return (
    <div className="min-h-screen font-sans pb-28 relative overflow-hidden">
      <DashboardHeader 
        user={dashboard.user} 
        onShowProfile={() => dashboard.setShowProfile(true)} 
        onLogout={dashboard.handleLogout} 
      />

      <OfflineBanner />
      <InstallPrompt />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 relative z-10">
        <DashboardHome user={dashboard.user} />
        
        <CaloriesRing burned={totalCalories} goal={dashboard.user?.calorie_goal || 2000} />
        <MacroTracker 
          protein={totalProtein} carbs={totalCarbs} fats={totalFats}
          proteinGoal={dashboard.user?.protein_goal} carbsGoal={dashboard.user?.carb_goal} fatsGoal={dashboard.user?.fat_goal}
        />

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
