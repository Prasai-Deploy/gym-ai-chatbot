import { WebhookPayload, IntegrationProvider } from './integration.types';
import { syncEngine } from './SyncEngine';
import { logger } from '@logger/index';

export class WebhookReceiver {
  public async receive(payload: WebhookPayload): Promise<void> {
    logger.info(`[WebhookReceiver] Received ${payload.eventType} webhook from ${payload.provider}`);

    // Verify provider signature in production via HMAC
    // this.verifySignature(payload.provider, payload.signature, rawBody);

    switch (payload.provider) {
      case 'whoop':
        await this.handleWHOOP(payload);
        break;
      case 'garmin':
        await this.handleGarmin(payload);
        break;
      case 'fitbit':
        await this.handleFitbit(payload);
        break;
      case 'oura':
        await this.handleOura(payload);
        break;
      default:
        logger.warn(`[WebhookReceiver] Unhandled provider webhook: ${payload.provider}`);
    }
  }

  private async handleWHOOP(payload: WebhookPayload): Promise<void> {
    // WHOOP pushes recovery / cycle / sleep events
    if (payload.userId) {
      await syncEngine.syncProvider(payload.userId, 'whoop');
    }
  }

  private async handleGarmin(payload: WebhookPayload): Promise<void> {
    // Garmin pushes activity uploads via push notifications
    if (payload.userId) {
      await syncEngine.syncProvider(payload.userId, 'garmin');
    }
  }

  private async handleFitbit(payload: WebhookPayload): Promise<void> {
    if (payload.userId) {
      await syncEngine.syncProvider(payload.userId, 'fitbit');
    }
  }

  private async handleOura(payload: WebhookPayload): Promise<void> {
    if (payload.userId) {
      await syncEngine.syncProvider(payload.userId, 'oura');
    }
  }
}

export const webhookReceiver = new WebhookReceiver();
