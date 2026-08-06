export interface UserNotificationSettings {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export class NotificationClient {
  private static STORAGE_KEY = 'striva_user_notification_settings';

  public static getSettings(): UserNotificationSettings {
    try {
      const raw = localStorage.getItem(NotificationClient.STORAGE_KEY);
      return raw ? JSON.parse(raw) : NotificationClient.getDefaults();
    } catch {
      return NotificationClient.getDefaults();
    }
  }

  public static saveSettings(settings: UserNotificationSettings): void {
    localStorage.setItem(NotificationClient.STORAGE_KEY, JSON.stringify(settings));
  }

  public static getDefaults(): UserNotificationSettings {
    return {
      inApp: true,
      push: true,
      email: true,
      sms: false,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  }

  public static async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}
