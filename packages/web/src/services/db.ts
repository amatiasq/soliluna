import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Ingredient, Recipe, Dish } from '@soliluna/shared';

export interface OutboxEntry {
  id?: number; // auto-incremented by IndexedDB
  method: string;
  url: string;
  body?: unknown;
  createdAt: string;
  retries: number;
  status: 'pending' | 'failed';
}

interface SolilunaDB extends DBSchema {
  ingredients: { key: string; value: Ingredient };
  recipes: { key: string; value: Recipe };
  dishes: { key: string; value: Dish };
  outbox: { key: number; value: OutboxEntry; autoIncrement: true };
  meta: { key: string; value: { key: string; value: string } };
}

export type StoreName = 'ingredients' | 'recipes' | 'dishes';

let dbInstance: IDBPDatabase<SolilunaDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SolilunaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SolilunaDB>('soliluna', 1, {
    upgrade(db) {
      db.createObjectStore('ingredients', { keyPath: 'id' });
      db.createObjectStore('recipes', { keyPath: 'id' });
      db.createObjectStore('dishes', { keyPath: 'id' });
      db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

export async function getAllFromStore<T extends StoreName>(
  storeName: T,
): Promise<SolilunaDB[T]['value'][]> {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function getFromStore<T extends StoreName>(
  storeName: T,
  id: string,
): Promise<SolilunaDB[T]['value'] | undefined> {
  const db = await getDB();
  return db.get(storeName, id);
}

export async function putInStore<T extends StoreName>(
  storeName: T,
  item: SolilunaDB[T]['value'],
): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item);
}

/** Clears the store before writing. */
export async function putAllInStore<T extends StoreName>(
  storeName: T,
  items: SolilunaDB[T]['value'][],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  for (const item of items) {
    tx.store.put(item);
  }
  await tx.done;
}

export async function deleteFromStore<T extends StoreName>(
  storeName: T,
  id: string,
): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

export async function addToOutbox(
  entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'retries' | 'status'>,
): Promise<void> {
  const db = await getDB();
  await db.add('outbox', {
    ...entry,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  });
}

export async function getOutboxEntries(): Promise<(OutboxEntry & { id: number })[]> {
  const db = await getDB();
  const all = await db.getAll('outbox');
  return all
    .filter((entry) => entry.status === 'pending')
    .map((entry) => entry as OutboxEntry & { id: number });
}

export async function removeFromOutbox(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('outbox', id);
}

export async function markOutboxFailed(id: number): Promise<void> {
  const db = await getDB();
  const entry = await db.get('outbox', id);
  if (!entry) return;
  await db.put('outbox', { ...entry, status: 'failed' });
}

export async function incrementOutboxRetries(id: number): Promise<void> {
  const db = await getDB();
  const entry = await db.get('outbox', id);
  if (!entry) return;
  await db.put('outbox', { ...entry, retries: entry.retries + 1 });
}

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}
