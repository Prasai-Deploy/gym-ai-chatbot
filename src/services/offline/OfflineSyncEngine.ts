import { indexedDBStore, OfflineRecord } from './IndexedDBStore';
import { httpClient } from '../../api/httpClient';

export class OfflineSyncEngine {
  private static instance: OfflineSyncEngine;
  private isSyncing = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAll();
      });
    }
  }

  public static getInstance(): OfflineSyncEngine {
    if (!OfflineSyncEngine.instance) {
      OfflineSyncEngine.instance = new OfflineSyncEngine();
    }
    return OfflineSyncEngine.instance;
  }

  public async getPendingCount(): Promise<number> {
    const stores = ['workout_logs', 'nutrition_logs', 'attendance_logs', 'trainer_notes'];
    let count = 0;

    for (const store of stores) {
      const records = await indexedDBStore.getRecords(store);
      count += records.filter((r) => !r.synced).length;
    }

    return count;
  }

  public async syncAll(): Promise<number> {
    if (this.isSyncing || !navigator.onLine) return 0;
    this.isSyncing = true;

    let syncedCount = 0;
    const stores = ['workout_logs', 'nutrition_logs', 'attendance_logs', 'trainer_notes'];

    try {
      for (const store of stores) {
        const records = await indexedDBStore.getRecords(store);
        for (const record of records) {
          try {
            await this.syncRecord(store, record);
            await indexedDBStore.deleteRecord(store, record.id);
            syncedCount++;
          } catch (err) {
            console.error(`Failed to sync record ${record.id} from ${store}:`, err);
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return syncedCount;
  }

  private async syncRecord(storeName: string, record: OfflineRecord): Promise<void> {
    switch (storeName) {
      case 'workout_logs':
        await httpClient.post('/workouts/sets', record.data);
        break;
      case 'nutrition_logs':
        await httpClient.post('/progress/water', record.data);
        break;
      case 'attendance_logs':
        await httpClient.post('/admin/attendance/checkin', record.data);
        break;
      case 'trainer_notes':
        await httpClient.post('/admin/trainer/notes', record.data);
        break;
    }
  }
}

export const offlineSyncEngine = OfflineSyncEngine.getInstance();
