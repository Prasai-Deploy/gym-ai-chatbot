export type MemoryCategory =
  | 'PROFILE'
  | 'FITNESS'
  | 'TRAINING'
  | 'NUTRITION'
  | 'RECOVERY'
  | 'GOALS'
  | 'PREFERENCES'
  | 'HABITS'
  | 'EQUIPMENT'
  | 'SCHEDULE'
  | 'COACHING_STYLE';

export type MemorySource = 'explicit' | 'inferred';
export type MemoryConfidence = 'high' | 'medium' | 'low';

export interface MemoryValuePayload {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: MemoryConfidence;
  source: MemorySource;
  last_confirmed_at: string;
  active: boolean;
}

export interface MemoryCandidate {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: MemoryConfidence;
  source: MemorySource;
  userId: string;
  organizationId: string;
  agentId?: string;
  lastConfirmedAt?: string;
}

export interface StructuredMemoryRecord {
  id?: string;
  userId: string;
  organizationId: string;
  agentId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: MemoryConfidence;
  source: MemorySource;
  active: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastConfirmedAt?: string;
}
