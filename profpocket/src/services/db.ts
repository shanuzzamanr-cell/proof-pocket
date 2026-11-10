import { Purchase } from '../types';
import { INITIAL_PURCHASES } from '../data/samplePurchases';

const DB_NAME = 'proofpocket_idb';
const DB_VERSION = 1;
const STORE_NAME = 'purchases';
const SEED_FLAG_KEY = 'proofpocket_idb_seeded_v2';

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB instance.
 * Automatically handles schema migrations and fallback handling.
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_category', 'category', { unique: false });
        store.createIndex('by_purchaseDate', 'purchaseDate', { unique: false });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
        store.createIndex('by_brand', 'brand', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => {
        dbInstance = null;
        initPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      initPromise = null;
      reject(request.error || new Error('Failed to open ProofPocket IndexedDB'));
    };
  });

  return initPromise;
}

/**
 * Helper to run a transaction on the purchases store.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let result: T;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));

    try {
      const res = callback(store);
      if (res instanceof Promise) {
        res.then((r) => {
          result = r;
        }).catch(reject);
      } else {
        result = res;
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all saved purchases from IndexedDB sorted by createdAt descending.
 */
export async function getAllPurchases(): Promise<Purchase[]> {
  try {
    return await withStore<Purchase[]>('readonly', (store) => {
      return new Promise<Purchase[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = (request.result as Purchase[]) || [];
          // Sort newest created first by default
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    });
  } catch (err) {
    console.error('[ProofPocket DB] Error retrieving purchases:', err);
    // Fallback to localStorage if IndexedDB encounters an issue
    try {
      const local = localStorage.getItem('proofpocket_purchases_fallback');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Retrieves a single purchase by ID.
 */
export async function getPurchaseById(id: string): Promise<Purchase | null> {
  return withStore<Purchase | null>('readonly', (store) => {
    return new Promise<Purchase | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Saves a new purchase record to IndexedDB.
 */
export async function addPurchaseRecord(purchase: Purchase): Promise<Purchase> {
  return withStore<Purchase>('readwrite', (store) => {
    return new Promise<Purchase>((resolve, reject) => {
      const request = store.add(purchase);
      request.onsuccess = () => resolve(purchase);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Updates an existing purchase record.
 */
export async function updatePurchaseRecord(
  id: string,
  updates: Partial<Purchase>
): Promise<Purchase> {
  return withStore<Purchase>('readwrite', async (store) => {
    return new Promise<Purchase>((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as Purchase | undefined;
        if (!existing) {
          reject(new Error(`Purchase with id "${id}" not found in database.`));
          return;
        }

        const updated: Purchase = {
          ...existing,
          ...updates,
          id: existing.id, // prevent ID change
          updatedAt: new Date().toISOString(),
        };

        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

/**
 * Deletes a purchase record from IndexedDB.
 */
export async function deletePurchaseRecord(id: string): Promise<void> {
  return withStore<void>('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Clears all purchases from the database.
 */
export async function clearAllPurchasesFromDB(): Promise<void> {
  return withStore<void>('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        localStorage.setItem(SEED_FLAG_KEY, 'cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Seeds or resets the database with initial sample purchases.
 */
export async function seedInitialPurchases(force: boolean = false): Promise<Purchase[]> {
  const existing = await getAllPurchases();
  const wasCleared = localStorage.getItem(SEED_FLAG_KEY) === 'cleared';

  if (!force && (existing.length > 0 || wasCleared)) {
    return existing;
  }

  // Insert all initial purchases
  await withStore<void>('readwrite', (store) => {
    store.clear();
    for (const item of INITIAL_PURCHASES) {
      store.add(item);
    }
  });

  localStorage.removeItem(SEED_FLAG_KEY);
  return INITIAL_PURCHASES;
}

/**
 * Bulk imports purchases (for restoring JSON backups).
 */
export async function bulkImportPurchases(purchases: Purchase[]): Promise<number> {
  let count = 0;
  await withStore<void>('readwrite', (store) => {
    for (const item of purchases) {
      if (item && item.id && item.productName) {
        store.put(item);
        count++;
      }
    }
  });
  localStorage.removeItem(SEED_FLAG_KEY);
  return count;
}
