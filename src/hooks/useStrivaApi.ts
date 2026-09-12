import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "../api/httpClient";
import { supabase } from "../lib/supabase";
import { useEffect } from "react";

const demoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === "true";

function demoFallback<T>(error: unknown, fallback: T): T {
  if (demoModeEnabled) return fallback;
  throw error;
}

// ==========================================
// 1. Dashboard API Hook
// ==========================================
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        const data = await httpClient.get("/identity/profile");
        return data;
      } catch (err) {
        return demoFallback(err, {
          recoveryScore: 88,
          dailyMission: "Hypertrophy Upper Body Push & Core Focus",
          coachRecommendation:
            "Perform 4 sets of Bench Press at 85% 1RM. Maintain 90s rest.",
          caloriesTarget: 2650,
          caloriesLogged: 1940,
          hydrationMl: 2500,
          weeklyStreak: 5,
        });
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// 2. AI Coach API Hook
// ==========================================
export function useCoachData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["coach", "history"],
    queryFn: async () => {
      try {
        const res: any = await httpClient.get("/intelligence/recommendations");
        return res?.data ?? res ?? [];
      } catch (err) {
        return demoFallback(err, [
          {
            id: "1",
            role: "assistant",
            content:
              "Hello! I'm Coach Trinity. Ready to crush today's upper body workout?",
            timestamp: "10:00 AM",
          },
        ]);
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      try {
        const res = await httpClient.post("/ai/chat", { message: messageText });
        return res;
      } catch (err) {
        return demoFallback(err, {
          reply:
            "Demo response: keep your next set controlled and stop if form breaks down.",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach", "history"] });
    },
  });

  return {
    ...query,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}

// ==========================================
// 3. Workout Engine API Hook
// ==========================================
export function useWorkoutData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["workout", "current"],
    queryFn: async () => {
      try {
        const response: any = await httpClient.get("/workouts/programs", {
          params: { latest: true },
        });
        const payload = response?.data ?? response;
        const program = Array.isArray(payload) ? payload[0] : payload;
        return {
          ...program,
          workoutTitle: program?.title || program?.name,
        };
      } catch (err) {
        return demoFallback(err, {
          workoutTitle: "Hypertrophy Upper Body Push",
          durationMinutes: 45,
          totalVolumeKg: 12450,
          exercisesCount: 5,
          demo: true,
        });
      }
    },
  });

  const logSetMutation = useMutation({
    mutationFn: async (setPayload: {
      setId?: string;
      exerciseId: string;
      weightKg: number;
      reps: number;
      rpe: number;
    }) => {
      if (!setPayload.setId) {
        return demoFallback(
          new Error("This workout does not have a persisted set to update."),
          {
            success: true,
            demo: true,
            persisted: false,
          },
        );
      }
      return httpClient.patch(`/workouts/sets/${setPayload.setId}`, {
        weight_kg: setPayload.weightKg,
        reps: setPayload.reps,
        rpe: setPayload.rpe,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", "current"] });
    },
  });

  return {
    ...query,
    logSet: logSetMutation.mutateAsync,
    isLoggingSet: logSetMutation.isPending,
    isDemoMode: demoModeEnabled,
  };
}

// ==========================================
// 4. Nutrition & Recovery API Hook
// ==========================================
export function useNutritionData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["nutrition", "daily"],
    queryFn: async () => {
      try {
        return await httpClient.get("/intelligence/context");
      } catch (err) {
        return demoFallback(err, {
          targetCalories: 2650,
          consumedCalories: 1940,
          proteinG: 180,
          carbsG: 220,
          fatsG: 65,
          hydrationMl: 2500,
        });
      }
    },
  });

  const logWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      return httpClient.post("/intelligence/nutrition/log", {
        water_ml: amountMl,
        source: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "daily"] });
    },
  });

  return {
    ...query,
    logWater: logWaterMutation.mutateAsync,
    isLoggingWater: logWaterMutation.isPending,
  };
}

// ==========================================
// 5. Progress Analytics API Hook
// ==========================================
export function useProgressData() {
  return useQuery({
    queryKey: ["progress", "analytics"],
    queryFn: async () => {
      try {
        return await httpClient.get("/progress/statistics");
      } catch (err) {
        return demoFallback(err, {
          healthScore: 92,
          currentStreak: 14,
          weightChangeKg: -1.8,
          strengthGrowthPct: 14.5,
        });
      }
    },
  });
}

// ==========================================
// 6. Owner SaaS Business OS API Hook
// ==========================================
export function useOwnerData() {
  return useQuery({
    queryKey: ["owner", "dashboard"],
    queryFn: async () => {
      try {
        return await httpClient.get("/analytics/executive");
      } catch (err) {
        return demoFallback(err, {
          mrr: 48250,
          activeMembers: 1240,
          todayAttendance: 680,
          activeTrainers: 12,
        });
      }
    },
  });
}

// ==========================================
// 7. Trainer Workspace API Hook
// ==========================================
export function useTrainerData() {
  return useQuery({
    queryKey: ["trainer", "workspace"],
    queryFn: async () => {
      try {
        return await httpClient.get("/analytics/trainers");
      } catch (err) {
        return demoFallback(err, {
          activeClientsCount: 24,
          pendingCheckInsCount: 3,
          sessionsTodayCount: 5,
        });
      }
    },
  });
}

// ==========================================
// 8. Member Directory API Hook
// ==========================================
export function useMembersData(search?: string, filter?: string) {
  return useQuery({
    queryKey: ["members", search, filter],
    queryFn: async () => {
      try {
        return await httpClient.get("/admin/members", {
          params: { search, filter },
        });
      } catch (err) {
        return demoFallback(err, {
          totalCount: 1240,
          avgHealthScore: 88,
          churnRiskCount: 14,
        });
      }
    },
  });
}

// ==========================================
// 9. Attendance & Access Control API Hook (With Realtime)
// ==========================================
export function useAttendanceData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["attendance", "live"],
    queryFn: async () => {
      try {
        return await httpClient.get("/analytics/attendance");
      } catch (err) {
        return demoFallback(err, {
          occupancyCount: 142,
          maxCapacity: 200,
          totalCheckinsToday: 680,
        });
      }
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("attendance-turnstile-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "organization_audit_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["attendance", "live"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// ==========================================
// 10. Membership & Billing API Hook
// ==========================================
export function useBillingData() {
  return useQuery({
    queryKey: ["billing", "metrics"],
    queryFn: async () => {
      try {
        return await httpClient.get("/billing/admin/metrics");
      } catch (err) {
        return demoFallback(err, {
          mrr: 48250,
          arr: 579000,
          ltv: 1840,
          forecast90Days: 158000,
        });
      }
    },
  });
}
