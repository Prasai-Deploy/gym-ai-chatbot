export interface TrainerListItem {
  id: string; // organization_members id
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

export interface TrainerAssignedMember {
  assignmentId: string;
  memberUserId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  assignedAt: string;
}

export interface AssignMemberDTO {
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
