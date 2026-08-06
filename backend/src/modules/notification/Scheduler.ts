import { automationEngine } from './AutomationEngine';
import { logger } from '@logger/index';

export class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;

  public startScheduler(): void {
    if (this.intervalId) return;

    logger.info('[Scheduler] Notification & Digest Scheduler Service started.');
    // Run periodic cron check every 60 seconds
    this.intervalId = setInterval(() => {
      this.runPeriodicTasks();
    }, 60000);
  }

  public stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[Scheduler] Notification Scheduler stopped.');
    }
  }

  private runPeriodicTasks(): void {
    // Periodic automation check for scheduled reminders
    logger.info('[Scheduler] Running periodic automation check...');
  }
}

export const scheduler = new Scheduler();
