export type IntegrationProvider =
  | 'apple_healthkit'
  | 'google_fit'
  | 'whoop'
  | 'garmin'
  | 'fitbit'
  | 'oura'
  | 'polar'
  | 'samsung_health'
  | 'google_calendar'
  | 'outlook_calendar';

export type IntegrationCategory = 'health_platform' | 'wearable' | 'calendar';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'disconnected';

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  scope?: string;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  organizationId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  tokens: OAuthTokenSet;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ─── Normalized STRIVA Health Data Model ────────────────────────────────────

export interface NormalizedWorkoutActivity {
  sourceProvider: IntegrationProvider;
  userId: string;
  activityType: string;        // e.g. 'Running', 'Strength Training'
  startTime: string;
  durationMinutes: number;
  caloriesBurned?: number;
  heartRateAvgBpm?: number;
  heartRateMaxBpm?: number;
  distanceMeters?: number;
  steps?: number;
  rawPayload?: any;
}

export interface NormalizedSleepData {
  sourceProvider: IntegrationProvider;
  userId: string;
  date: string;
  durationMinutes: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  lightSleepMinutes?: number;
  sleepScore?: number;
  rawPayload?: any;
}

export interface NormalizedHRVData {
  sourceProvider: IntegrationProvider;
  userId: string;
  timestamp: string;
  hrvMs: number;           // RMSSD in milliseconds
  restingHrBpm?: number;
  recoveryScore?: number;
  rawPayload?: any;
}

export interface NormalizedCalendarEvent {
  sourceProvider: IntegrationProvider;
  userId: string;
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  location?: string;
  rawPayload?: any;
}

export interface WebhookPayload {
  provider: IntegrationProvider;
  userId?: string;
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
  signature?: string;
}

export interface SyncResult {
  provider: IntegrationProvider;
  userId: string;
  recordsSynced: number;
  errors: string[];
  durationMs: number;
}

export interface IntegrationAnalyticsRecord {
  provider: IntegrationProvider;
  organizationId: string;
  userId: string;
  eventType: 'connect' | 'sync' | 'disconnect' | 'webhook' | 'error';
  recordCount?: number;
  durationMs?: number;
  timestamp: string;
}
