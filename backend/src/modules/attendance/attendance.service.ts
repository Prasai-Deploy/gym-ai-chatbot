import { AttendanceRepository } from './attendance.repository';
import { AttendanceRecord, CheckInDTO, TodayAttendanceOverview, TodayAttendanceItem } from './attendance.types';
import { ForbiddenError, ValidationError, NotFoundError, ConflictError } from '@errors/AppError';

export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository = new AttendanceRepository()) {}

  async checkIn(
    callerUserId: string,
    callerRole: string,
    orgId: string,
    dto: CheckInDTO
  ): Promise<AttendanceRecord> {
    const targetUserId = dto.userId || callerUserId;

    // 1. If checking in someone other than self:
    if (targetUserId !== callerUserId) {
      const allowedStaffRoles = [
        'Platform Super Admin',
        'Organization Owner',
        'Gym Manager',
        'Front Desk',
        'Trainer',
      ];

      if (!allowedStaffRoles.includes(callerRole)) {
        throw new ForbiddenError(`Role '${callerRole}' is not authorized to check in other members`);
      }
    }

    // 2. Validate target member belongs to this organization
    const belongsToOrg = await this.repository.isUserInOrg(orgId, targetUserId);
    if (!belongsToOrg) {
      throw new ForbiddenError(`Target user does not belong to organization '${orgId}'`);
    }

    // 3. Prevent duplicate active check-ins within last 12 hours
    const existingActive = await this.repository.findActiveCheckIn(orgId, targetUserId);
    if (existingActive) {
      const checkInAgeMs = Date.now() - new Date(existingActive.check_in_time).getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (checkInAgeMs < twelveHoursMs) {
        throw new ConflictError(`Member already has an active check-in session from ${new Date(existingActive.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      }
    }

    // 4. Create new check-in record
    const record = await this.repository.createCheckIn({
      organization_id: orgId,
      user_id: targetUserId,
      location_id: dto.locationId,
      check_in_time: new Date().toISOString(),
      status: 'active',
    });

    if (!record) {
      throw new ValidationError('Failed to record attendance check-in');
    }

    return record;
  }

  async checkOut(
    callerUserId: string,
    callerRole: string,
    orgId: string,
    attendanceId: string
  ): Promise<AttendanceRecord> {
    const now = new Date();
    // Retrieve record to verify ownership / org
    const existing = await this.repository.findById(orgId, attendanceId);

    if (!existing) {
      throw new NotFoundError('Attendance record not found in this organization');
    }

    if (existing.status === 'completed') {
      throw new ValidationError('Attendance record has already been checked out');
    }

    // If caller is not staff, they can only check out their own attendance
    const isStaff = ['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer'].includes(callerRole);
    if (!isStaff && existing.user_id !== callerUserId) {
      throw new ForbiddenError('Members can only check out their own attendance sessions');
    }

    const checkInTime = new Date(existing.check_in_time);
    const durationMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));

    const updated = await this.repository.checkOut(attendanceId, now.toISOString(), durationMinutes);
    if (!updated) {
      throw new ValidationError('Failed to record attendance checkout');
    }

    return updated;
  }

  async getTodayOverview(orgId: string): Promise<TodayAttendanceOverview> {
    return this.repository.getTodayOverview(orgId);
  }

  async getHistory(orgId: string, userId?: string, limit = 50): Promise<AttendanceRecord[] | TodayAttendanceItem[]> {
    if (!userId) {
      return this.repository.getOrganizationHistory(orgId, limit);
    }
    return this.repository.getHistory(orgId, userId, limit);
  }

  async searchMembers(orgId: string, query: string, limit = 10) {
    return this.repository.searchMembers(orgId, query, limit);
  }
}
