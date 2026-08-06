import { NotificationEvent, NotificationPreferences, NotificationChannel } from './notification.types';

export class RuleEngine {
  public evaluateChannels(
    event: NotificationEvent,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    if (this.isInQuietHours(preferences)) {
      // In quiet hours, restrict to in_app only
      return ['in_app'];
    }

    return preferences.enabledChannels;
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

    const now = new Date();
    const currentHour = now.getHours();

    const startHour = parseInt(preferences.quietHoursStart.split(':')[0], 10);
    const endHour = parseInt(preferences.quietHoursEnd.split(':')[0], 10);

    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    }
    return currentHour >= startHour && currentHour < endHour;
  }
}

export const ruleEngine = new RuleEngine();
