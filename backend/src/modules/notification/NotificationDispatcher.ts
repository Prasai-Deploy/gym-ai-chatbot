import {
  NotificationEvent,
  NotificationChannel,
  EmailProvider,
  SMSProvider,
  PushProvider,
  WhatsAppProvider,
} from './notification.types';
import { logger } from '@logger/index';
import { notificationRepository } from './notification.repository';

export class MockEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
    logger.info(`[EmailProvider Abstraction] Sent email to ${to}: ${subject}`);
    return true;
  }
}

export class MockSMSProvider implements SMSProvider {
  async sendSMS(toPhone: string, message: string): Promise<boolean> {
    logger.info(`[SMSProvider Abstraction] Sent SMS to ${toPhone}: ${message}`);
    return true;
  }
}

export class MockPushProvider implements PushProvider {
  async sendPushNotification(deviceToken: string, title: string, body: string): Promise<boolean> {
    logger.info(`[PushProvider Abstraction] Sent Web Push to ${deviceToken}: ${title}`);
    return true;
  }
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendWhatsAppMessage(toPhone: string, templateName: string, params: Record<string, any>): Promise<boolean> {
    logger.info(`[WhatsAppProvider Interface] Sent WhatsApp message to ${toPhone} using template ${templateName}`);
    return true;
  }
}

export class NotificationDispatcher {
  private emailProvider: EmailProvider = new MockEmailProvider();
  private smsProvider: SMSProvider = new MockSMSProvider();
  private pushProvider: PushProvider = new MockPushProvider();
  private whatsappProvider: WhatsAppProvider = new MockWhatsAppProvider();

  public async dispatch(event: NotificationEvent, channels: NotificationChannel[]): Promise<void> {
    logger.info(`[NotificationDispatcher] Dispatching notification '${event.title}' to user ${event.userId}`);

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in_app':
            if (event.organizationId) {
              await notificationRepository.upsertDeduplicatedNotification({
                organization_id: event.organizationId,
                recipient_user_id: event.userId,
                type: event.category || 'system',
                severity: event.metadata?.severity || 'info',
                title: event.title,
                message: event.message,
                action_path: event.metadata?.actionPath,
                action_label: event.metadata?.actionLabel,
                resource_type: event.metadata?.resourceType,
                resource_id: event.metadata?.resourceId,
                deduplication_key: event.metadata?.deduplicationKey,
                metadata: event.metadata || {},
              });
            }
            break;
          case 'email':
            await this.emailProvider.sendEmail(
              event.metadata?.email || 'user@striva.app',
              event.title,
              `<p>${event.message}</p>`
            );
            break;
          case 'sms':
            await this.smsProvider.sendSMS(event.metadata?.phone || '+15550192831', `${event.title}: ${event.message}`);
            break;
          case 'push':
            await this.pushProvider.sendPushNotification(
              event.metadata?.deviceToken || 'dev_token_sample',
              event.title,
              event.message
            );
            break;
          case 'whatsapp':
            await this.whatsappProvider.sendWhatsAppMessage(
              event.metadata?.phone || '+15550192831',
              'striva_alert_template',
              { title: event.title, message: event.message }
            );
            break;
        }
      } catch (err: any) {
        logger.error(`[NotificationDispatcher] Channel ${channel} dispatch error: ${err?.message || err}`);
      }
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
