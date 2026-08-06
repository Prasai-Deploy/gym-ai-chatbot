export interface QueuedMutation {
  id: string;
  endpoint: string;
  payload: any;
  timestamp: number;
}

export class OfflineQueue {
  private static STORAGE_KEY = 'striva_offline_queue';

  public static getQueue(): QueuedMutation[] {
    try {
      const raw = localStorage.getItem(OfflineQueue.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static enqueue(endpoint: string, payload: any): void {
    const queue = OfflineQueue.getQueue();
    const newMutation: QueuedMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      endpoint,
      payload,
      timestamp: Date.now(),
    };
    queue.push(newMutation);
    localStorage.setItem(OfflineQueue.STORAGE_KEY, JSON.stringify(queue));
  }

  public static clear(): void {
    localStorage.removeItem(OfflineQueue.STORAGE_KEY);
  }

  public static async processQueue(executor: (mutation: QueuedMutation) => Promise<void>): Promise<number> {
    const queue = OfflineQueue.getQueue();
    if (queue.length === 0) return 0;

    let processedCount = 0;
    for (const item of queue) {
      try {
        await executor(item);
        processedCount++;
      } catch (err) {
        console.error('Failed to sync offline item:', item, err);
      }
    }

    OfflineQueue.clear();
    return processedCount;
  }
}
