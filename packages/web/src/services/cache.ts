import type { Ingredient, Recipe, Dish } from '@soliluna/shared';
import {
  getAllFromStore,
  getFromStore,
  putInStore,
  putAllInStore,
  addToOutbox,
  StoreName,
} from './db';

// -- Types --

type EntityOfStore<S extends StoreName> = S extends 'ingredients'
  ? Ingredient
  : S extends 'recipes'
    ? Recipe
    : Dish;

/**
 * Fetches a list of entities using a stale-while-revalidate strategy:
 * 1. Read cached data from IndexedDB immediately
 * 2. Attempt to fetch fresh data from the API
 * 3. If the API fails, fall back to the cached data
 */
export async function fetchWithCache<S extends StoreName>(
  storeName: S,
  apiFn: () => Promise<EntityOfStore<S>[]>,
): Promise<{ data: EntityOfStore<S>[]; fromCache: boolean }> {
  const cached = (await getAllFromStore(storeName)) as EntityOfStore<S>[];

  try {
    const fresh = await apiFn();
    await putAllInStore(storeName, fresh as never[]);
    return { data: fresh, fromCache: false };
  } catch {
    // If offline or the API fails, return whatever we have in cache
    if (cached.length > 0) {
      return { data: cached, fromCache: true };
    }
    throw new Error(`Failed to fetch ${storeName} and no cached data is available`);
  }
}

/**
 * Fetches a single entity by id with cache fallback.
 * Same stale-while-revalidate pattern as fetchWithCache.
 */
export async function fetchOneWithCache<S extends StoreName>(
  storeName: S,
  id: string,
  apiFn: () => Promise<EntityOfStore<S>>,
): Promise<{ data: EntityOfStore<S>; fromCache: boolean }> {
  const cached = (await getFromStore(storeName, id)) as EntityOfStore<S> | undefined;

  try {
    const fresh = await apiFn();
    await putInStore(storeName, fresh as never);
    return { data: fresh, fromCache: false };
  } catch {
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw new Error(`Failed to fetch ${storeName}/${id} and no cached data is available`);
  }
}

/**
 * Saves an entity optimistically: writes to IndexedDB first, then
 * tries the API. If the API call fails while offline, the mutation
 * is queued in the outbox for later sync.
 *
 * Returns 'synced' if the API call succeeded, or 'offline' if it
 * was queued for later.
 */
export async function saveWithOfflineFallback<S extends StoreName>(
  storeName: S,
  item: EntityOfStore<S>,
  method: string,
  url: string,
  body: unknown,
  apiFn: () => Promise<unknown>,
): Promise<'synced' | 'offline'> {
  // Optimistic: write to IndexedDB immediately
  await putInStore(storeName, item as never);

  try {
    await apiFn();
    return 'synced';
  } catch (error) {
    if (!navigator.onLine) {
      await addToOutbox({ method, url, body });
      return 'offline';
    }
    // If we are online but the API failed, it is a real error
    throw error;
  }
}
