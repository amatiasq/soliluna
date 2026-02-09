import { useEffect, useState, useCallback, useRef } from 'react';
import { getAllFromStore, getFromStore, putAllInStore, putInStore } from '../services/db';
import type { StoreName } from '../services/db';

// -- List hook --

interface UseEntityListResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches a list of entities with stale-while-revalidate:
 * 1. Show cached data from IndexedDB instantly (no loading spinner).
 * 2. Fetch fresh data from the API in parallel.
 * 3. When the API responds, replace the data and update the cache.
 * 4. If the API fails and we have cache, keep showing cached data silently.
 */
export function useEntityList<T extends { id: string }>(
  storeName: StoreName,
  apiFn: () => Promise<T[]>,
): UseEntityListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;

  const fetchData = useCallback(() => {
    setError(null);

    // 1. Read cache first (sorted by name to match API's ORDER BY name)
    const cachePromise = getAllFromStore(storeName)
      .then((cached) => {
        if (cached.length > 0) {
          const sorted = (cached as unknown as T[]).sort((a, b) => {
            const nameA = (a as Record<string, unknown>).name as string ?? '';
            const nameB = (b as Record<string, unknown>).name as string ?? '';
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          });
          setData(sorted);
          setIsLoading(false);
        }
        return cached.length > 0;
      })
      .catch(() => false);

    // 2. Fetch from API in parallel
    apiFnRef.current()
      .then(async (fresh) => {
        setData(fresh);
        setIsLoading(false);
        await putAllInStore(storeName, fresh as never[]);
      })
      .catch(async () => {
        // Wait for cache read to complete before deciding on error.
        // Without this, the API can fail before the cache resolves,
        // causing a false "Error al cargar datos" when data IS cached.
        const hadCachedData = await cachePromise;
        setIsLoading(false);
        if (!hadCachedData) {
          setError('Error al cargar datos');
        }
      });
  }, [storeName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// -- Single entity hook --

interface UseEntityResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches a single entity by id with stale-while-revalidate.
 * Same two-step pattern as useEntityList.
 */
export function useEntity<T extends { id: string }>(
  storeName: StoreName,
  id: string | undefined,
  apiFn: () => Promise<T>,
): UseEntityResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;

  const fetchData = useCallback(() => {
    if (!id) return;

    setError(null);

    // 1. Read cache first
    const cachePromise = getFromStore(storeName, id)
      .then((cached) => {
        if (cached) {
          setData(cached as unknown as T);
          setIsLoading(false);
        }
        return cached != null;
      })
      .catch(() => false);

    // 2. Fetch from API in parallel
    apiFnRef.current()
      .then(async (fresh) => {
        setData(fresh);
        setIsLoading(false);
        await putInStore(storeName, fresh as never);
      })
      .catch(async () => {
        const hadCachedData = await cachePromise;
        setIsLoading(false);
        if (!hadCachedData) {
          setError('Error al cargar datos');
        }
      });
  }, [storeName, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
