/**
 * offlineStorage.ts
 * Lightweight IndexedDB wrapper for offline-first data persistence.
 * Caches user data, progress, and plans locally.
 * Queues write operations when offline and replays them on reconnect.
 */

const DB_NAME = 'striva-offline';
const DB_VERSION = 1;

// Store names
const STORES = {
  USER: 'user',
  PROGRESS: 'progress',
  PLANS: 'plans',
  QUEUE: 'pendingQueue',
} as const;

export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: string;
  timestamp: number;
  clientRequestId?: string;
}

// ── Database Connection ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Simple key-value stores for cached data
      if (!db.objectStoreNames.contains(STORES.USER)) {
        db.createObjectStore(STORES.USER, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        db.createObjectStore(STORES.PROGRESS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        db.createObjectStore(STORES.PLANS, { keyPath: 'key' });
      }
      // Queue for offline writes
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        db.createObjectStore(STORES.QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Generic Get/Set ──────────────────────────────────────────────────────────

async function setItem<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getItem<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.value ?? null);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// ── Public API: Cache Reads ──────────────────────────────────────────────────

export async function cacheUser(user: any): Promise<void> {
  try { await setItem(STORES.USER, 'currentUser', user); } catch (e) { console.warn('[Offline] Failed to cache user:', e); }
}

export async function getCachedUser(): Promise<any | null> {
  try { return await getItem(STORES.USER, 'currentUser'); } catch { return null; }
}

export async function cacheProgress(progress: any[]): Promise<void> {
  try { await setItem(STORES.PROGRESS, 'recentProgress', progress); } catch (e) { console.warn('[Offline] Failed to cache progress:', e); }
}

export async function getCachedProgress(): Promise<any[] | null> {
  try { return await getItem(STORES.PROGRESS, 'recentProgress'); } catch { return null; }
}

export async function cachePlans(plans: any[]): Promise<void> {
  try { await setItem(STORES.PLANS, 'recentPlans', plans); } catch (e) { console.warn('[Offline] Failed to cache plans:', e); }
}

export async function getCachedPlans(): Promise<any[] | null> {
  try { return await getItem(STORES.PLANS, 'recentPlans'); } catch { return null; }
}

// ── Public API: Offline Queue ────────────────────────────────────────────────

export async function queueRequest(url: string, method: string, body: any, clientRequestId?: string): Promise<boolean> {
  try {
    const db = await openDB();
    const serializedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const tx = db.transaction(STORES.QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.QUEUE);

    // Deduplication check: inspect existing items in queue to prevent duplicate submissions
    const allReq = store.getAll();
    const existingItems: QueuedRequest[] = await new Promise((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result);
      allReq.onerror = () => reject(allReq.error);
    });

    const isDuplicate = existingItems.some((item) => {
      if (clientRequestId && item.clientRequestId === clientRequestId) return true;
      return item.url === url && item.method === method && item.body === serializedBody;
    });

    if (isDuplicate) {
      console.log('[Offline] Suppressed duplicate queued request:', method, url);
      db.close();
      return false;
    }

    store.add({
      url,
      method,
      body: serializedBody,
      timestamp: Date.now(),
      clientRequestId: clientRequestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`),
    } as QueuedRequest);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
    console.log('[Offline] Queued request:', method, url);
    return true;
  } catch (e) {
    console.warn('[Offline] Failed to queue request:', e);
    return false;
  }
}

export async function replayQueue(): Promise<number> {
  let replayed = 0;
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.QUEUE, 'readonly');
    const store = tx.objectStore(STORES.QUEUE);
    const allRequest = store.getAll();

    const items: QueuedRequest[] = await new Promise((resolve, reject) => {
      allRequest.onsuccess = () => resolve(allRequest.result);
      allRequest.onerror = () => reject(allRequest.error);
    });
    db.close();

    for (const item of items) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (item.clientRequestId) {
          headers['X-Client-Request-Id'] = item.clientRequestId;
        }

        const response = await fetch(item.url, {
          method: item.method,
          headers,
          body: item.body,
        });

        if (response.ok) {
          // Remove from queue after successful replay
          const db2 = await openDB();
          const delTx = db2.transaction(STORES.QUEUE, 'readwrite');
          delTx.objectStore(STORES.QUEUE).delete(item.id!);
          await new Promise<void>((resolve) => {
            delTx.oncomplete = () => { db2.close(); resolve(); };
          });
          replayed++;
        } else if (response.status >= 400 && response.status < 500) {
          // Permanent client rejection (validation failure, 401/403/422). Discard to avoid infinite failed loops.
          console.warn(`[Offline] Dropping permanently rejected queued request (${response.status}):`, item.url);
          const db2 = await openDB();
          const delTx = db2.transaction(STORES.QUEUE, 'readwrite');
          delTx.objectStore(STORES.QUEUE).delete(item.id!);
          await new Promise<void>((resolve) => {
            delTx.oncomplete = () => { db2.close(); resolve(); };
          });
        } else {
          // Transient 5xx or gateway timeout - leave in queue and retry next time
          break;
        }
      } catch {
        // Still offline or network error — leave in queue
        break;
      }
    }
  } catch (e) {
    console.warn('[Offline] Failed to replay queue:', e);
  }
  if (replayed > 0) {
    console.log(`[Offline] Replayed ${replayed} queued request(s)`);
  }
  return replayed;
}

export async function getQueueSize(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.QUEUE, 'readonly');
    const store = tx.objectStore(STORES.QUEUE);
    const countReq = store.count();
    return new Promise((resolve) => {
      countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
      countReq.onerror = () => { db.close(); resolve(0); };
    });
  } catch {
    return 0;
  }
}
