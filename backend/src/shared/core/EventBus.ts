import { EventEmitter } from 'events';
import { logger } from '@logger/index';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit if many modules subscribe to the same event
    this.setMaxListeners(20);
  }

  public publish(eventType: string, payload: any): void {
    logger.info({ eventType, payload }, `[EventBus] Publishing event: ${eventType}`);
    this.emit(eventType, payload);
  }

  public subscribe(eventType: string, handler: (payload: any) => void | Promise<void>): void {
    logger.info(`[EventBus] Subscribing to event: ${eventType}`);
    this.on(eventType, async (payload) => {
      try {
        await handler(payload);
      } catch (err: any) {
        logger.error({ err, eventType, payload }, `[EventBus] Error handling event: ${eventType}`);
      }
    });
  }
}

// Singleton instance
export const eventBus = new EventBus();
