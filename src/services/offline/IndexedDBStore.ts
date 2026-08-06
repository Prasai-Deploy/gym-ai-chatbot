export interface OfflineRecord {
  id: string;
  storeName: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export class IndexedDBStore {
  private static DB_NAME = 'striva_offline_db';
  private static DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBStore.DB_NAME, IndexedDBStore.DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        const stores = [
          'workout_logs',
          'nutrition_logs',
          'attendance_logs',
          'trainer_notes',
          'cached_dashboard',
          'cached_members',
          'cached_ai_history',
        ];

        stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  public async saveRecord(storeName: string, id: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const record: OfflineRecord = {
        id,
        storeName,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  public async getRecords(storeName: string): Promise<OfflineRecord[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event: any) => resolve(event.target.result || []);
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  public async deleteRecord(storeName: string, id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }
}

export const indexedDBStore = new IndexedDBStore();
