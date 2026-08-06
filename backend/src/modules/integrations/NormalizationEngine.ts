import {
  IntegrationProvider,
  NormalizedWorkoutActivity,
  NormalizedSleepData,
  NormalizedHRVData,
  NormalizedCalendarEvent,
} from './integration.types';

export class NormalizationEngine {
  public normalizeWHOOP(raw: any, userId: string): { hrv?: NormalizedHRVData; sleep?: NormalizedSleepData } {
    const result: any = {};

    if (raw?.records?.[0]) {
      const rec = raw.records[0];
      result.hrv = {
        sourceProvider: 'whoop' as IntegrationProvider,
        userId,
        timestamp: rec.created_at || new Date().toISOString(),
        hrvMs: rec.score?.hrv_rmssd_milli || 0,
        restingHrBpm: rec.score?.resting_heart_rate || 0,
        recoveryScore: rec.score?.recovery_score || 0,
        rawPayload: rec,
      } as NormalizedHRVData;
    }

    return result;
  }

  public normalizeGarmin(raw: any, userId: string): NormalizedWorkoutActivity[] {
    const dailies = Array.isArray(raw) ? raw : [raw];
    return dailies.map((day: any) => ({
      sourceProvider: 'garmin' as IntegrationProvider,
      userId,
      activityType: 'Daily Activity',
      startTime: day.startTimeInSeconds ? new Date(day.startTimeInSeconds * 1000).toISOString() : new Date().toISOString(),
      durationMinutes: Math.round((day.durationInSeconds || 0) / 60),
      caloriesBurned: day.activeKilocalories || 0,
      steps: day.steps || 0,
      rawPayload: day,
    }));
  }

  public normalizeFitbit(raw: any, userId: string): NormalizedHRVData[] {
    const zones = raw?.['activities-heart']?.[0]?.value?.heartRateZones || [];
    const restingHr = raw?.['activities-heart']?.[0]?.value?.restingHeartRate || 0;
    return [{
      sourceProvider: 'fitbit' as IntegrationProvider,
      userId,
      timestamp: raw?.['activities-heart']?.[0]?.dateTime || new Date().toISOString(),
      hrvMs: 0, // Fitbit doesn't expose HRV directly via this endpoint
      restingHrBpm: restingHr,
      rawPayload: { zones, restingHr },
    }];
  }

  public normalizeOura(raw: any, userId: string): NormalizedHRVData[] {
    const records = raw?.data || [];
    return records.map((rec: any) => ({
      sourceProvider: 'oura' as IntegrationProvider,
      userId,
      timestamp: rec.day || new Date().toISOString(),
      hrvMs: rec.average_hrv || 0,
      restingHrBpm: rec.lowest_heart_rate || 0,
      recoveryScore: rec.score || 0,
      rawPayload: rec,
    }));
  }

  public normalizePolar(raw: any, userId: string): NormalizedWorkoutActivity[] {
    const exercises = Array.isArray(raw) ? raw : (raw?.exercises || []);
    return exercises.map((ex: any) => ({
      sourceProvider: 'polar' as IntegrationProvider,
      userId,
      activityType: ex.detailed_sport_info || 'Workout',
      startTime: ex.start_time || new Date().toISOString(),
      durationMinutes: Math.round((ex.duration || 0) / 60000),
      caloriesBurned: ex.calories || 0,
      heartRateAvgBpm: ex.heart_rate?.average || 0,
      heartRateMaxBpm: ex.heart_rate?.maximum || 0,
      rawPayload: ex,
    }));
  }

  public normalizeGoogleCalendar(raw: any, userId: string): NormalizedCalendarEvent[] {
    const events = raw?.items || [];
    return events.map((ev: any) => ({
      sourceProvider: 'google_calendar' as IntegrationProvider,
      userId,
      eventId: ev.id,
      title: ev.summary || 'Untitled Event',
      startTime: ev.start?.dateTime || ev.start?.date || '',
      endTime: ev.end?.dateTime || ev.end?.date || '',
      isRecurring: !!ev.recurringEventId,
      location: ev.location,
      rawPayload: ev,
    }));
  }

  public normalizeOutlookCalendar(raw: any, userId: string): NormalizedCalendarEvent[] {
    const events = raw?.value || [];
    return events.map((ev: any) => ({
      sourceProvider: 'outlook_calendar' as IntegrationProvider,
      userId,
      eventId: ev.id,
      title: ev.subject || 'Untitled Event',
      startTime: ev.start?.dateTime || '',
      endTime: ev.end?.dateTime || '',
      isRecurring: !!ev.recurrence,
      location: ev.location?.displayName,
      rawPayload: ev,
    }));
  }
}

export const normalizationEngine = new NormalizationEngine();
