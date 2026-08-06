import { IntegrationProvider, SyncResult, IntegrationConnection } from './integration.types';
import { PROVIDER_MAP } from './OAuthProvider';
import { normalizationEngine } from './NormalizationEngine';
import { logger } from '@logger/index';

// In-memory connection store (swap for Supabase table in production)
const connectionStore = new Map<string, IntegrationConnection>();

export class SyncEngine {
  public storeConnection(conn: IntegrationConnection): void {
    connectionStore.set(`${conn.userId}:${conn.provider}`, conn);
  }

  public getConnection(userId: string, provider: IntegrationProvider): IntegrationConnection | undefined {
    return connectionStore.get(`${userId}:${provider}`);
  }

  public listUserConnections(userId: string): IntegrationConnection[] {
    return Array.from(connectionStore.values()).filter((c) => c.userId === userId);
  }

  public async syncProvider(userId: string, provider: IntegrationProvider): Promise<SyncResult> {
    const startMs = Date.now();
    const errors: string[] = [];
    let recordsSynced = 0;

    const connection = this.getConnection(userId, provider);
    if (!connection) {
      return { provider, userId, recordsSynced: 0, errors: [`No connection found for provider ${provider}`], durationMs: 0 };
    }

    const oauthProvider = PROVIDER_MAP[provider];
    if (!oauthProvider) {
      return { provider, userId, recordsSynced: 0, errors: [`Provider ${provider} not supported`], durationMs: 0 };
    }

    // Auto-refresh expired tokens
    let tokens = connection.tokens;
    if (oauthProvider.isTokenExpired(tokens) && tokens.refreshToken) {
      try {
        tokens = await oauthProvider.refreshAccessToken(tokens.refreshToken);
        connection.tokens = tokens;
        this.storeConnection(connection);
        logger.info(`[SyncEngine] Token refreshed for ${provider} / user ${userId}`);
      } catch (err: any) {
        return { provider, userId, recordsSynced: 0, errors: [`Token refresh failed: ${err.message}`], durationMs: Date.now() - startMs };
      }
    }

    try {
      const rawData = await oauthProvider.fetchData(tokens, userId);

      // Normalize based on provider
      switch (provider) {
        case 'whoop': normalizationEngine.normalizeWHOOP(rawData, userId); recordsSynced = 1; break;
        case 'garmin': recordsSynced = normalizationEngine.normalizeGarmin(rawData, userId).length; break;
        case 'fitbit': recordsSynced = normalizationEngine.normalizeFitbit(rawData, userId).length; break;
        case 'oura': recordsSynced = normalizationEngine.normalizeOura(rawData, userId).length; break;
        case 'polar': recordsSynced = normalizationEngine.normalizePolar(rawData, userId).length; break;
        case 'google_calendar': recordsSynced = normalizationEngine.normalizeGoogleCalendar(rawData, userId).length; break;
        case 'outlook_calendar': recordsSynced = normalizationEngine.normalizeOutlookCalendar(rawData, userId).length; break;
        default: recordsSynced = 1;
      }

      connection.syncStatus = 'success';
      connection.lastSyncedAt = new Date().toISOString();
      this.storeConnection(connection);

      logger.info(`[SyncEngine] Synced ${recordsSynced} records from ${provider} for user ${userId}`);
    } catch (err: any) {
      errors.push(err.message);
      connection.syncStatus = 'error';
      connection.errorMessage = err.message;
      this.storeConnection(connection);
    }

    return { provider, userId, recordsSynced, errors, durationMs: Date.now() - startMs };
  }

  public async syncAllForUser(userId: string): Promise<SyncResult[]> {
    const connections = this.listUserConnections(userId);
    const results: SyncResult[] = [];

    for (const conn of connections) {
      const result = await this.syncProvider(userId, conn.provider);
      results.push(result);
    }

    return results;
  }
}

export const syncEngine = new SyncEngine();
