import { ulid } from 'ulid';

/** Sent as X-Client-Id so the server leaves the sender out of its broadcasts. */
export const CLIENT_ID = ulid();

export interface InvalidateEvent {
  entity: 'ingredients' | 'recipes' | 'dishes';
  id: string;
  action: 'create' | 'update' | 'delete';
}

type InvalidateHandler = (event: InvalidateEvent) => void;

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<InvalidateHandler>();

const RECONNECT_DELAY_MS = 3_000;

function connect(): void {
  if (eventSource) return;

  eventSource = new EventSource(`/api/events?clientId=${CLIENT_ID}`);

  eventSource.addEventListener('invalidate', (event) => {
    try {
      const data = JSON.parse(event.data) as InvalidateEvent;
      for (const handler of listeners) {
        handler(data);
      }
    } catch {
      // Ignore malformed events
    }
  });

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (listeners.size > 0 && navigator.onLine) {
          connect();
        }
      }, RECONNECT_DELAY_MS);
    }
  };
}

/** Connects on the first handler, disconnects when the last unsubscribes. */
export function onInvalidate(handler: InvalidateHandler): () => void {
  listeners.add(handler);

  if (listeners.size === 1) {
    connect();
  }

  return () => {
    listeners.delete(handler);

    if (listeners.size === 0) {
      eventSource?.close();
      eventSource = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }
  };
}
