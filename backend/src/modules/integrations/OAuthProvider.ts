import { OAuthTokenSet, IntegrationProvider } from './integration.types';

export interface OAuthProviderConfig {
  provider: IntegrationProvider;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export abstract class OAuthProvider {
  constructor(protected config: OAuthProviderConfig) {}

  public getAuthorizationUrl(userId: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state || userId,
    });
    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed for ${this.config.provider}: ${response.statusText}`);
    }

    const json: any = await response.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
      scope: json.scope,
    };
  }

  public async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed for ${this.config.provider}: ${response.statusText}`);
    }

    const json: any = await response.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
      scope: json.scope,
    };
  }

  public isTokenExpired(tokens: OAuthTokenSet): boolean {
    return Date.now() >= tokens.expiresAt - 60_000; // 60s buffer
  }

  public abstract fetchData(tokens: OAuthTokenSet, userId: string): Promise<any>;
}

// ─── Provider Implementations ────────────────────────────────────────────────

export class WHOOPProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'whoop',
      clientId: process.env.WHOOP_CLIENT_ID || '',
      clientSecret: process.env.WHOOP_CLIENT_SECRET || '',
      authorizationUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
      tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
      scopes: ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout', 'offline'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/whoop`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://api.prod.whoop.com/developer/v1/recovery/', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`WHOOP data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class GarminProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'garmin',
      clientId: process.env.GARMIN_CLIENT_ID || '',
      clientSecret: process.env.GARMIN_CLIENT_SECRET || '',
      authorizationUrl: 'https://connect.garmin.com/oauthConfirm',
      tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
      scopes: ['ACTIVITY_EXPORT', 'WELLNESS'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/garmin`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://apis.garmin.com/wellness-api/rest/dailies', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Garmin data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class FitbitProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'fitbit',
      clientId: process.env.FITBIT_CLIENT_ID || '',
      clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
      authorizationUrl: 'https://www.fitbit.com/oauth2/authorize',
      tokenUrl: 'https://api.fitbit.com/oauth2/token',
      scopes: ['activity', 'heartrate', 'sleep', 'profile'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/fitbit`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Fitbit data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class OuraProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'oura',
      clientId: process.env.OURA_CLIENT_ID || '',
      clientSecret: process.env.OURA_CLIENT_SECRET || '',
      authorizationUrl: 'https://cloud.ouraring.com/oauth/authorize',
      tokenUrl: 'https://api.ouraring.com/oauth/token',
      scopes: ['daily', 'heartrate', 'workout', 'sleep'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/oura`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://api.ouraring.com/v2/usercollection/daily_readiness', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Oura data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class PolarProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'polar',
      clientId: process.env.POLAR_CLIENT_ID || '',
      clientSecret: process.env.POLAR_CLIENT_SECRET || '',
      authorizationUrl: 'https://flow.polar.com/oauth2/authorization',
      tokenUrl: 'https://polarremote.com/v2/oauth2/token',
      scopes: ['accesslink.read_all'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/polar`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://www.polaraccesslink.com/v3/exercises', {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Polar data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class GoogleFitProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'google_fit',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/fitness.activity.read', 'https://www.googleapis.com/auth/fitness.heart_rate.read'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/google_fit`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const now = Date.now();
    const body = JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: now - 86400000,
      endTimeMillis: now,
    });
    const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`Google Fit data fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class GoogleCalendarProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'google_calendar',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/google_calendar`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google Calendar fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class OutlookCalendarProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'outlook_calendar',
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['Calendars.Read', 'offline_access'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/outlook_calendar`,
    });
  }

  public async fetchData(tokens: OAuthTokenSet, _userId: string): Promise<any> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events?$top=10&$orderby=start/dateTime', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`Outlook Calendar fetch failed: ${res.statusText}`);
    return res.json();
  }
}

export class AppleHealthKitProvider extends OAuthProvider {
  constructor() {
    super({
      provider: 'apple_healthkit',
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scopes: ['name', 'email'],
      redirectUri: `${process.env.BACKEND_URL}/api/v1/integrations/callback/apple_healthkit`,
    });
  }

  // Apple HealthKit is primarily mobile SDK-based; data is pushed via device webhooks
  public async fetchData(_tokens: OAuthTokenSet, _userId: string): Promise<any> {
    return { note: 'Apple HealthKit data ingested via mobile SDK push' };
  }
}

// ─── Provider Registry ───────────────────────────────────────────────────────
export const PROVIDER_MAP: Record<string, OAuthProvider> = {
  whoop: new WHOOPProvider(),
  garmin: new GarminProvider(),
  fitbit: new FitbitProvider(),
  oura: new OuraProvider(),
  polar: new PolarProvider(),
  google_fit: new GoogleFitProvider(),
  google_calendar: new GoogleCalendarProvider(),
  outlook_calendar: new OutlookCalendarProvider(),
  apple_healthkit: new AppleHealthKitProvider(),
};
