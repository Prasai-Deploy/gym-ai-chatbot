import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { PROVIDER_MAP } from './OAuthProvider';
import { syncEngine } from './SyncEngine';
import { webhookReceiver } from './WebhookReceiver';
import { integrationAnalytics } from './IntegrationAnalytics';
import { IntegrationConnection, IntegrationProvider } from './integration.types';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@config/env';
import { AppError, AuthError, ValidationError } from '@errors/AppError';

export const integrationRouter = Router();

const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_MAP);
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function signOAuthState(userId: string, organizationId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, organizationId, issuedAt: Date.now() }),
  ).toString('base64url');
  const signature = createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyOAuthState(state: string | undefined): { userId: string; organizationId: string } {
  if (!state) throw new AuthError('Missing OAuth state');
  const [payload, signature] = state.split('.');
  if (!payload || !signature) throw new AuthError('Invalid OAuth state');

  const expected = createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY)
    .update(payload)
    .digest('base64url');
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new AuthError('Invalid OAuth state');
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (
    !parsed.userId ||
    !parsed.organizationId ||
    Date.now() - parsed.issuedAt > OAUTH_STATE_MAX_AGE_MS
  ) {
    throw new AuthError('Expired OAuth state');
  }
  return { userId: parsed.userId, organizationId: parsed.organizationId };
}

// ─── GET /integrations — List all supported integrations with connection status
integrationRouter.get('/', requireAuth, tenantMiddleware, (req, res) => {
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
integrationRouter.get('/connect/:provider', requireAuth, tenantMiddleware, (req, res) => {
  const { provider } = req.params;
  const userId = (req as any).user.id;

  const oauthProvider = PROVIDER_MAP[provider];
  if (!oauthProvider) {
    return res.status(404).json({ success: false, error: `Provider '${provider}' not supported` });
  }

  const state = signOAuthState(userId, req.organizationContext!.organizationId);
  const authUrl = oauthProvider.getAuthorizationUrl(userId, state);
  res.json({ success: true, data: { authorizationUrl: authUrl, provider } });
});

// ─── GET /integrations/callback/:provider — OAuth callback handler
integrationRouter.get('/callback/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code) throw new ValidationError('Missing OAuth authorization code');
    const { userId, organizationId: orgId } = verifyOAuthState(state);

    const oauthProvider = PROVIDER_MAP[provider];
    if (!oauthProvider)
      return res.status(404).json({ success: false, error: `Provider ${provider} not found` });

    const tokens = await oauthProvider.exchangeCodeForTokens(code);

    const connection: IntegrationConnection = {
      id: `conn-${Date.now()}`,
      userId,
      organizationId: orgId,
      provider: provider as IntegrationProvider,
      category: ['google_calendar', 'outlook_calendar'].includes(provider)
        ? 'calendar'
        : 'wearable',
      tokens,
      syncStatus: 'idle',
      createdAt: new Date().toISOString(),
    };

    syncEngine.storeConnection(connection);
    integrationAnalytics.record({
      provider: provider as IntegrationProvider,
      organizationId: orgId,
      userId,
      eventType: 'connect',
    });

    res.redirect(`/v3/profile?integration=${provider}&status=connected`);
  } catch (err) {
    next(err);
  }
});

// ─── POST /integrations/sync/all — Sync all connected providers
// Keep this route before /sync/:provider so "all" is not treated as a provider name.
integrationRouter.post('/sync/all', requireAuth, tenantMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const results = await syncEngine.syncAllForUser(userId);
    res.json({ success: true, data: { results } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /integrations/sync/:provider — Trigger manual sync
integrationRouter.post('/sync/:provider', requireAuth, tenantMiddleware, async (req, res, next) => {
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

// ─── POST /integrations/webhook/:provider — Webhook ingestion endpoint
integrationRouter.post('/webhook/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    if (!env.INTEGRATION_WEBHOOK_SECRET) {
      throw new AppError('Integration webhooks are not configured', 503);
    }
    const suppliedSignature = req.headers['x-signature'];
    if (typeof suppliedSignature !== 'string') throw new AuthError('Missing webhook signature');
    const expectedSignature = createHmac('sha256', env.INTEGRATION_WEBHOOK_SECRET)
      .update((req as any).rawBody || '')
      .digest('hex');
    const suppliedBuffer = Buffer.from(suppliedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new AuthError('Invalid webhook signature');
    }
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
integrationRouter.get('/analytics', requireAuth, tenantMiddleware, (req, res) => {
  const orgId = req.organizationContext?.organizationId || '';
  const summary = integrationAnalytics.getSummary(orgId);
  res.json({ success: true, data: summary });
});
