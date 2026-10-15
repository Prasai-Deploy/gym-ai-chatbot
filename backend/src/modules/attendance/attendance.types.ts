export interface AttendanceRecord {
  id: string;
  organization_id: string;
  user_id: string;
  location_id?: string;
  check_in_time: string;
  check_out_time?: string;
  duration_minutes?: number;
  status: 'active' | 'completed' | 'no_show' | 'cancelled';
  created_at: string;
}

export interface CheckInDTO {
  userId?: string;
  locationId?: string;
}

export interface CheckOutDTO {
  attendanceId: string;
}

export interface TodayAttendanceItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'active' | 'completed' | 'no_show' | 'cancelled';
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
