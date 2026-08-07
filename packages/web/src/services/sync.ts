import type { Ingredient, Recipe, Dish } from '@soliluna/shared';
import {
  getOutboxEntries,
  removeFromOutbox,
  markOutboxFailed,
  incrementOutboxRetries,
  getMeta,
  setMeta,
  putInStore,
  deleteFromStore,
} from './db';
import { fetchWithCache } from './cache';
import { getIngredients, getRecipes, getDishes } from './api';
import { CLIENT_ID } from './events';

const MAX_RETRIES = 5;

/** FIFO. An entry is removed only after a 2xx, or a rejected write is lost silently. */
export async function flushOutbox(): Promise<void> {
  const entries = await getOutboxEntries();

  for (const entry of entries) {
    try {
      const headers: Record<string, string> = { 'X-Client-Id': CLIENT_ID };
      if (entry.body) headers['Content-Type'] = 'application/json';

      const response = await fetch(entry.url, {
        method: entry.method,
        headers,
        body: entry.body ? JSON.stringify(entry.body) : undefined,
      });

      // Credentials gone: every remaining entry fails the same way, so stop
      // without burning retries and let a re-authenticated flush send them.
      if (response.status === 401 || response.status === 403) return;

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await removeFromOutbox(entry.id);
    } catch {
      if (entry.retries >= MAX_RETRIES - 1) {
        await markOutboxFailed(entry.id);
      } else {
        await incrementOutboxRetries(entry.id);
      }
    }
  }
}

export async function preloadAllData(): Promise<void> {
  await Promise.all([
    fetchWithCache('ingredients', getIngredients),
    fetchWithCache('recipes', getRecipes),
    fetchWithCache('dishes', getDishes),
  ]);
}

interface SyncChangesResponse {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  deletions: Array<{ entity: string; entityId: string; deletedAt: string }>;
}

async function pollForChanges(): Promise<void> {
  const lastSync = await getMeta('lastSyncAt');
  const since = lastSync ?? '1970-01-01T00:00:00.000Z';

  const response = await fetch(`/api/sync/changes?since=${encodeURIComponent(since)}`);
  if (!response.ok) return;

  const json = await response.json();
  const data = json.data as SyncChangesResponse;

  for (const ingredient of data.ingredients) {
    await putInStore('ingredients', ingredient);
  }
  for (const recipe of data.recipes) {
    await putInStore('recipes', recipe);
  }
  for (const dish of data.dishes) {
    await putInStore('dishes', dish);
  }

  for (const deletion of data.deletions) {
    const storeMap: Record<string, 'ingredients' | 'recipes' | 'dishes'> = {
      ingredient: 'ingredients',
      recipe: 'recipes',
      dish: 'dishes',
    };
    const storeName = storeMap[deletion.entity];
    if (storeName) {
      await deleteFromStore(storeName, deletion.entityId);
    }
  }

  await setMeta('lastSyncAt', new Date().toISOString());
}

const POLL_INTERVAL_MS = 60_000;

/** Returns a cleanup function that removes every listener and timer. */
export function setupSyncListeners(): () => void {
  const handleOnline = async () => {
    await flushOutbox();
    preloadAllData();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      preloadAllData();
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const intervalId = setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      pollForChanges();
    }
  }, POLL_INTERVAL_MS);

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(intervalId);
  };
}
