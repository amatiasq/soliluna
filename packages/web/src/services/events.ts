import { ulid } from 'ulid';

/**
 * Unique identifier for this browser tab/instance.
 * Sent as X-Client-Id header on mutations so the server
 * can exclude the sender from SSE broadcasts.
 */
export const CLIENT_ID = ulid();

// -- Types --

export interface InvalidateEvent {
  entity: 'ingredients' | 'recipes' | 'dishes';
  id: string;
  action: 'create' | 'update' | 'delete';
}

type InvalidateHandler = (event: InvalidateEvent) => void;

// -- SSE connection manager --

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<InvalidateHandler>();

const RECONNECT_DELAY_MS = 3_000;

/**
 * Opens an SSE connection to the server. When a change notification arrives,
 * all registered handlers are called with the event data.
 *
 * Automatically reconnects on disconnect after a short delay.
 */
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
    // Connection lost — close and schedule a reconnect
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

/**
 * Registers a handler for invalidation events.
 * The SSE connection is opened when the first handler registers
 * and closed when the last handler unregisters.
 *
 * Returns an unsubscribe function.
 */
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
