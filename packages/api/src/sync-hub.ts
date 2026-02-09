/**
 * Durable Object that maintains SSE connections and broadcasts
 * invalidation events when data changes on the server.
 *
 * Architecture:
 * - Each connected client opens an SSE connection via GET /api/events
 * - When any client writes data (POST/PUT/DELETE), the Worker notifies this DO
 * - The DO broadcasts the change to all OTHER connected clients
 * - Clients receiving the event re-fetch the affected entity
 */
export class SyncHub implements DurableObject {
  private connections: Map<string, { writable: WritableStreamDefaultWriter; clientId: string }>;
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.connections = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/connect') {
      return this.handleSSEConnection(request);
    }

    if (url.pathname === '/notify') {
      return this.handleNotify(request);
    }

    return new Response('Not found', { status: 404 });
  }

  /** Opens a new SSE connection for a client */
  private handleSSEConnection(request: Request): Response {
    const clientId = new URL(request.url).searchParams.get('clientId') || 'unknown';
    const connectionId = crypto.randomUUID();

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Store the connection
    this.connections.set(connectionId, { writable: writer, clientId });

    // Send initial connected event
    writer.write(encoder.encode(`event: connected\ndata: {"connectionId":"${connectionId}"}\n\n`));

    // Setup ping interval to keep connection alive
    const pingInterval = setInterval(async () => {
      try {
        await writer.write(encoder.encode(`event: ping\ndata: {}\n\n`));
      } catch {
        // Connection closed
        clearInterval(pingInterval);
        this.connections.delete(connectionId);
      }
    }, 30_000);

    // Cleanup on close
    request.signal?.addEventListener('abort', () => {
      clearInterval(pingInterval);
      this.connections.delete(connectionId);
      writer.close().catch(() => {});
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /** Broadcasts an invalidation event to all connected clients except the sender */
  private async handleNotify(request: Request): Promise<Response> {
    const body = await request.json() as {
      entity: string;
      id: string;
      action: string;
      senderClientId?: string;
    };

    const message = `event: invalidate\ndata: ${JSON.stringify({
      entity: body.entity,
      id: body.id,
      action: body.action,
    })}\n\n`;

    const encoder = new TextEncoder();
    const deadConnections: string[] = [];

    for (const [connId, conn] of this.connections) {
      // Skip the sender so they don't get their own change echoed back
      if (conn.clientId === body.senderClientId) continue;

      try {
        await conn.writable.write(encoder.encode(message));
      } catch {
        deadConnections.push(connId);
      }
    }

    // Cleanup dead connections
    for (const connId of deadConnections) {
      this.connections.delete(connId);
    }

    return new Response(JSON.stringify({ ok: true, recipients: this.connections.size }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
