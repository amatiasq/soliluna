import { useState, useEffect } from 'react';

/**
 * Returns true when the browser is online, false when offline.
 * Updates reactively as the connection status changes.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
