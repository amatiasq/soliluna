import { useEffect, useState, useCallback, useRef } from 'react';
import { getAllFromStore, getFromStore, putAllInStore, putInStore } from '../services/db';
import type { StoreName } from '../services/db';

interface UseEntityListResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Stale-while-revalidate: the cache renders instantly, the API replaces it. */
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

    // Sorted by name to match the API's ORDER BY.
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

    apiFnRef.current()
      .then(async (fresh) => {
        setData(fresh);
        setIsLoading(false);
        await putAllInStore(storeName, fresh as never[]);
      })
      .catch(async () => {
        // Wait for the cache: the API can fail first and show a false error.
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

interface UseEntityResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

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

    const cachePromise = getFromStore(storeName, id)
      .then((cached) => {
        if (cached) {
          setData(cached as unknown as T);
          setIsLoading(false);
        }
        return cached != null;
      })
      .catch(() => false);

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
