import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutApi } from '../../api/workoutApi';

export const useTodayWorkout = () => {
  return useQuery({
    queryKey: ['workout', 'today'],
    queryFn: async () => {
      const res = await workoutApi.getTodayWorkout();
      return res;
    }
  });
};

export const useStartWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutApi.startWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    }
  });
};

export const useLogWorkoutProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutApi.logProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    }
  });
};

export const useCompleteWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutApi.completeWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    }
  });
};
