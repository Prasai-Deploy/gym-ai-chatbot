export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';

export type NotificationCategory =
  | 'member'
  | 'trainer'
  | 'owner'
  | 'admin'
  | 'system'
  | 'ai_coach'
  | 'billing'
  | 'attendance'
  | 'workout'
  | 'nutrition';

export interface NotificationEvent {
  id: string;
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  quietHoursStart?: string; // e.g. "22:00"
  quietHoursEnd?: string;   // e.g. "07:00"
  timezone: string;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
}

export interface EmailProvider {
  sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean>;
}

export interface SMSProvider {
  sendSMS(toPhone: string, message: string): Promise<boolean>;
}

export interface PushProvider {
  sendPushNotification(deviceToken: string, title: string, body: string): Promise<boolean>;
}

export interface WhatsAppProvider {
  sendWhatsAppMessage(toPhone: string, templateName: string, params: Record<string, any>): Promise<boolean>;
}
