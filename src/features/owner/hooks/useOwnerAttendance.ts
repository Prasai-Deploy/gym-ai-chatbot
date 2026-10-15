import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, CheckInPayload, CheckOutPayload } from '../../../api/attendanceApi';

export const ATTENDANCE_QUERY_KEYS = {
  today: ['owner', 'attendance', 'today'] as const,
  history: (userId?: string, limit?: number) => ['owner', 'attendance', 'history', userId || 'all', limit || 50] as const,
};

export function useTodayAttendance() {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.today,
    queryFn: () => attendanceApi.getTodayAttendance(),
    staleTime: 15 * 1000, // 15 seconds
    refetchOnWindowFocus: true,
  });
}

export function useAttendanceHistory(userId?: string, limit = 50) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.history(userId, limit),
    queryFn: () => attendanceApi.getHistory({ userId, limit }),
    staleTime: 30 * 1000,
  });
}

export function useCheckInMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) => attendanceApi.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.today });
      queryClient.invalidateQueries({ queryKey: ['owner', 'attendance', 'history'] });
    },
  });
}

export function useCheckOutMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckOutPayload) => attendanceApi.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.today });
      queryClient.invalidateQueries({ queryKey: ['owner', 'attendance', 'history'] });
    },
  });
}
