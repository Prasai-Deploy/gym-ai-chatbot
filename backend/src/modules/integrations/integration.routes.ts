import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { PROVIDER_MAP } from './OAuthProvider';
import { syncEngine } from './SyncEngine';
import { webhookReceiver } from './WebhookReceiver';
import { integrationAnalytics } from './IntegrationAnalytics';
import { IntegrationConnection, IntegrationProvider } from './integration.types';

export const integrationRouter = Router();
integrationRouter.use(tenantMiddleware);

const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_MAP);

// ─── GET /integrations — List all supported integrations with connection status
integrationRouter.get('/', requireAuth, (req, res) => {
  const userId = (req as any).user.id;
  const connections = syncEngine.listUserConnections(userId);
  const connectedSet = new Set(connections.map((c) => c.provider));

  const integrations = SUPPORTED_PROVIDERS.map((p) => ({
    provider: p,
    connected: connectedSet.has(p as IntegrationProvider),
    status: connections.find((c) => c.provider === p)?.syncStatus || 'disconnected',
    lastSyncedAt: connections.find((c) => c.provider === p)?.lastSyncedAt || null,
  }));

  res.json({ success: true, data: { integrations } });
});

// ─── GET /integrations/connect/:provider — Get OAuth authorization URL
integrationRouter.get('/connect/:provider', requireAuth, (req, res) => {
  const { provider } = req.params;
  const userId = (req as any).user.id;

  const oauthProvider = PROVIDER_MAP[provider];
  if (!oauthProvider) {
    return res.status(404).json({ success: false, error: `Provider '${provider}' not supported` });
  }

  const authUrl = oauthProvider.getAuthorizationUrl(userId);
  res.json({ success: true, data: { authorizationUrl: authUrl, provider } });
});

// ─── GET /integrations/callback/:provider — OAuth callback handler
integrationRouter.get('/callback/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code, state: userId } = req.query as { code: string; state: string };
    const orgId = req.organizationContext?.organizationId || '00000000-0000-0000-0000-000000000001';

    const oauthProvider = PROVIDER_MAP[provider];
    if (!oauthProvider) return res.status(404).json({ success: false, error: `Provider ${provider} not found` });

    const tokens = await oauthProvider.exchangeCodeForTokens(code);

    const connection: IntegrationConnection = {
      id: `conn-${Date.now()}`,
      userId,
      organizationId: orgId,
      provider: provider as IntegrationProvider,
      category: ['google_calendar', 'outlook_calendar'].includes(provider) ? 'calendar' : 'wearable',
      tokens,
      syncStatus: 'idle',
      createdAt: new Date().toISOString(),
    };

    syncEngine.storeConnection(connection);
    integrationAnalytics.record({ provider: provider as IntegrationProvider, organizationId: orgId, userId, eventType: 'connect' });

    res.redirect(`/v3/settings?integration=${provider}&status=connected`);
  } catch (err) {
    next(err);
  }
});

// ─── POST /integrations/sync/:provider — Trigger manual sync
integrationRouter.post('/sync/:provider', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { provider } = req.params;

    const result = await syncEngine.syncProvider(userId, provider as IntegrationProvider);
    integrationAnalytics.record({
      provider: provider as IntegrationProvider,
      organizationId: req.organizationContext?.organizationId || '',
      userId,
      eventType: 'sync',
      recordCount: result.recordsSynced,
      durationMs: result.durationMs,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /integrations/sync/all — Sync all connected providers
integrationRouter.post('/sync/all', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const results = await syncEngine.syncAllForUser(userId);
    res.json({ success: true, data: { results } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /integrations/webhook/:provider — Webhook ingestion endpoint
integrationRouter.post('/webhook/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    await webhookReceiver.receive({
      provider: provider as IntegrationProvider,
      userId: req.body?.userId,
      eventType: req.body?.type || 'push',
      timestamp: new Date().toISOString(),
      data: req.body,
      signature: req.headers['x-signature'] as string,
    });
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /integrations/analytics — Integration usage analytics
integrationRouter.get('/analytics', requireAuth, (req, res) => {
  const orgId = req.organizationContext?.organizationId || '';
  const summary = integrationAnalytics.getSummary(orgId);
  res.json({ success: true, data: summary });
});
