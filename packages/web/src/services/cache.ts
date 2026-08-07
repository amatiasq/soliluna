import type { Ingredient, Recipe, Dish } from '@soliluna/shared';
import {
  getAllFromStore,
  getFromStore,
  putInStore,
  putAllInStore,
  addToOutbox,
  StoreName,
} from './db';

type EntityOfStore<S extends StoreName> = S extends 'ingredients'
  ? Ingredient
  : S extends 'recipes'
    ? Recipe
    : Dish;

/** Stale-while-revalidate over IndexedDB: fresh if the API answers, cached if not. */
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
    if (cached.length > 0) {
      return { data: cached, fromCache: true };
    }
    throw new Error(`Failed to fetch ${storeName} and no cached data is available`);
  }
}

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

/** Optimistic: IndexedDB first, then the API; offline the mutation goes to the outbox. */
export async function saveWithOfflineFallback<S extends StoreName>(
  storeName: S,
  item: EntityOfStore<S>,
  method: string,
  url: string,
  body: unknown,
  apiFn: () => Promise<unknown>,
): Promise<'synced' | 'offline'> {
  await putInStore(storeName, item as never);

  try {
    await apiFn();
    return 'synced';
  } catch (error) {
    if (!navigator.onLine) {
      await addToOutbox({ method, url, body });
      return 'offline';
    }
    throw error;
  }
}
