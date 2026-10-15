import { httpClient } from './httpClient';

export interface TodayAttendanceItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'active' | 'completed';
  durationMinutes: number | null;
  locationId: string | null;
  locationName: string | null;
}

export interface TodayAttendanceOverview {
  totalCheckInsToday: number;
  currentlyInsideCount: number;
  activeSessions: TodayAttendanceItem[];
  recentActivity: TodayAttendanceItem[];
}

export interface CheckInPayload {
  userId?: string;
  locationId?: string;
}

export interface CheckOutPayload {
  attendanceId: string;
}

export const attendanceApi = {
  getTodayAttendance: async (): Promise<TodayAttendanceOverview> => {
    const res = await httpClient.get<{ success: boolean; data: TodayAttendanceOverview }>('/attendance/today');
    return (res as any).data;
  },

  checkIn: async (payload: CheckInPayload = {}): Promise<TodayAttendanceItem> => {
    const res = await httpClient.post<{ success: boolean; data: TodayAttendanceItem }>('/attendance/checkin', payload);
    return (res as any).data;
  },

  checkOut: async (payload: CheckOutPayload): Promise<TodayAttendanceItem> => {
    const res = await httpClient.post<{ success: boolean; data: TodayAttendanceItem }>('/attendance/checkout', payload);
    return (res as any).data;
  },

  getHistory: async (params?: { userId?: string; limit?: number }): Promise<TodayAttendanceItem[]> => {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    const url = `/attendance/history${qs ? `?${qs}` : ''}`;
    const res = await httpClient.get<{ success: boolean; data: TodayAttendanceItem[] }>(url);
    return (res as any).data;
  },

  searchMembers: async (query: string, limit = 10): Promise<{ id: string; userId: string; name: string; email: string; avatarUrl: string | null; status: string }[]> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await httpClient.get<{ success: boolean; data: any[] }>(`/attendance/members/search?${params.toString()}`);
    return (res as any).data;
  },
};

