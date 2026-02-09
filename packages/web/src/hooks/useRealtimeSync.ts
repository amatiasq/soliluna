import { useEffect } from 'react';
import { onInvalidate, type InvalidateEvent } from '../services/events';
import { preloadAllData } from '../services/sync';

/**
 * Connects to the SSE stream and re-fetches all data whenever
 * another client makes a change on the server.
 *
 * This is the simplest integration: any invalidation triggers a
 * full reload of all entity lists. This is cheap because the data
 * set is small (ingredients, recipes, dishes for a single bakery).
 */
export function useRealtimeSync(): void {
  useEffect(() => {
    const handleInvalidate = (_event: InvalidateEvent) => {
      // Re-fetch everything so lists, detail pages, and cache stay fresh
      preloadAllData();
    };

    const unsubscribe = onInvalidate(handleInvalidate);
    return unsubscribe;
  }, []);
}
