import { httpClient } from './httpClient';

export interface TrainerListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  joinedAt: string;
  assignedMemberCount: number;
  locationId?: string | null;
  locationName?: string | null;
}

export interface TrainerAssignedMember {
  assignmentId: string;
  memberUserId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  assignedAt: string;
}

export interface TrainerDetailView {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  joinedAt: string;
  assignedMemberCount: number;
  locationId?: string | null;
  locationName?: string | null;
  assignedMembers: TrainerAssignedMember[];
}

export interface AssignMemberPayload {
  trainerUserId: string;
  memberUserId: string;
}

export interface TrainerMemberAssignmentRecord {
  id: string;
  organization_id: string;
  trainer_user_id: string;
  member_user_id: string;
  status: 'active' | 'inactive' | 'paused';
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export const trainerApi = {
  getTrainers: async (search?: string): Promise<TrainerListItem[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const qs = params.toString();
    const url = `/trainers${qs ? `?${qs}` : ''}`;
    const res = await httpClient.get<{ success: boolean; data: TrainerListItem[] }>(url);
    return (res as any).data;
  },

  getTrainerDetail: async (trainerUserId: string): Promise<TrainerDetailView> => {
    const res = await httpClient.get<{ success: boolean; data: TrainerDetailView }>(`/trainers/${trainerUserId}`);
    return (res as any).data;
  },

  assignMember: async (payload: AssignMemberPayload): Promise<TrainerMemberAssignmentRecord> => {
    const res = await httpClient.post<{ success: boolean; data: TrainerMemberAssignmentRecord }>('/trainers/assignments', payload);
    return (res as any).data;
  },

  removeAssignment: async (assignmentId: string): Promise<boolean> => {
    const res = await httpClient.delete<{ success: boolean; message: string }>(`/trainers/assignments/${assignmentId}`);
    return (res as any).success;
  },
};
