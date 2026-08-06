import { NotificationEvent, NotificationPreferences } from './notification.types';
import { ruleEngine } from './RuleEngine';
import { notificationDispatcher } from './NotificationDispatcher';
import { logger } from '@logger/index';

export class AutomationEngine {
  public async handleTrigger(
    event: NotificationEvent,
    userPreferences?: NotificationPreferences
  ): Promise<void> {
    logger.info(`[AutomationEngine] Processing trigger '${event.category}:${event.title}'`);

    const defaultPrefs: NotificationPreferences = userPreferences || {
      userId: event.userId,
      enabledChannels: ['in_app', 'push', 'email'],
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'UTC',
      digestFrequency: 'realtime',
    };

    const targetChannels = ruleEngine.evaluateChannels(event, defaultPrefs);
    await notificationDispatcher.dispatch(event, targetChannels);
  }

  // Pre-configured Automation Workflows
  public async triggerWorkoutReminder(userId: string, orgId: string, routineTitle: string): Promise<void> {
    await this.handleTrigger({
      id: `evt-${Date.now()}`,
      organizationId: orgId,
      userId,
      category: 'workout',
      title: 'Workout Reminder 🏋️‍♂️',
      message: `Your scheduled routine "${routineTitle}" is ready! Tap to start your session.`,
      timestamp: new Date().toISOString(),
    });
  }

  public async triggerPaymentFailureAlert(userId: string, orgId: string, amount: number): Promise<void> {
    await this.handleTrigger({
      id: `evt-${Date.now()}`,
      organizationId: orgId,
      userId,
      category: 'billing',
      title: 'Action Required: Card Payment Retry 💳',
      message: `Your recent subscription payment of $${amount} was declined. Please update your billing card.`,
      timestamp: new Date().toISOString(),
    });
  }

  public async triggerAchievementUnlock(userId: string, orgId: string, badgeTitle: string): Promise<void> {
    await this.handleTrigger({
      id: `evt-${Date.now()}`,
      organizationId: orgId,
      userId,
      category: 'member',
      title: 'Trophy Unlocked! 🏆',
      message: `Congratulations! You unlocked the "${badgeTitle}" achievement badge.`,
      timestamp: new Date().toISOString(),
    });
  }
}

export const automationEngine = new AutomationEngine();
