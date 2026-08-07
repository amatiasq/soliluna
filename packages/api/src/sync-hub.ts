// The hub lives in the process, so the fan-out reaches only the clients
// connected to THIS one: the service does not scale past a single replica.

/** A client that stopped reading leaves a write that never settles. */
const WRITE_TIMEOUT_MS = 2_000;

const PING_INTERVAL_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('write timeout')), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

interface Connection {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  clientId: string;
  ping: ReturnType<typeof setInterval>;
}

export type SyncEntity = 'ingredients' | 'recipes' | 'dishes';
export type SyncAction = 'create' | 'update' | 'delete';

export class SyncHub {
  private connections = new Map<string, Connection>();
  private encoder = new TextEncoder();

  /** Forgets a connection, stops its ping, and releases its writer. Safe to call twice. */
  private dropConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    this.connections.delete(connectionId);
    clearInterval(conn.ping);
    conn.writer.abort().catch(() => {});
  }

  /** Writes to one client. Returns false when the connection should be dropped. */
  private async writeTo(connectionId: string, chunk: Uint8Array): Promise<boolean> {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;

    try {
      await withTimeout(conn.writer.write(chunk), WRITE_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  /** Opens a new SSE connection for a client. */
  connect(clientId: string, signal?: AbortSignal): Response {
    const connectionId = crypto.randomUUID();

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    // Also the reaper: a client that stopped reading fails this write and is
    // dropped here, instead of piling up until some mutation notices.
    const ping = setInterval(async () => {
      const alive = await this.writeTo(connectionId, this.encoder.encode('event: ping\ndata: {}\n\n'));
      if (!alive) this.dropConnection(connectionId);
    }, PING_INTERVAL_MS);
    // Don't keep the process alive just because a client is connected.
    ping.unref?.();

    this.connections.set(connectionId, { writer, clientId, ping });

    writer
      .write(this.encoder.encode(`event: connected\ndata: {"connectionId":"${connectionId}"}\n\n`))
      .catch(() => this.dropConnection(connectionId));

    // Not to be relied on: the abort does not always fire for an SSE response.
    signal?.addEventListener('abort', () => this.dropConnection(connectionId));

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        // The app and the API share an origin, so no CORS header is needed.
      },
    });
  }

  /** Broadcasts an invalidation event to every connected client except the sender. */
  async notify(
    entity: SyncEntity,
    id: string,
    action: SyncAction,
    senderClientId?: string,
  ): Promise<number> {
    const chunk = this.encoder.encode(
      `event: invalidate\ndata: ${JSON.stringify({ entity, id, action })}\n\n`,
    );

    // In parallel: written in sequence, one client that stopped reading blocked
    // the whole broadcast, and with it every mutation waiting on it.
    const dead = await Promise.all(
      [...this.connections].map(async ([connId, conn]) => {
        if (conn.clientId === senderClientId) return null;
        return (await this.writeTo(connId, chunk)) ? null : connId;
      }),
    );

    for (const connId of dead) {
      if (connId) this.dropConnection(connId);
    }

    return this.connections.size;
  }
}
