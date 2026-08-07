import { useEffect } from 'react';
import { onInvalidate, type InvalidateEvent } from '../services/events';
import { preloadAllData } from '../services/sync';

/** Any invalidation reloads every list: one bakery's data is small enough. */
export function useRealtimeSync(): void {
  useEffect(() => {
    const handleInvalidate = (_event: InvalidateEvent) => {
      preloadAllData();
    };

    const unsubscribe = onInvalidate(handleInvalidate);
    return unsubscribe;
  }, []);
}
