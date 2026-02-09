import type { Env } from './types.js';

/**
 * Notifies connected clients about a data change via the SyncHub Durable Object.
 * Called after every successful POST/PUT/DELETE operation.
 */
export async function notifyChange(
  env: Env,
  entity: 'ingredients' | 'recipes' | 'dishes',
  id: string,
  action: 'create' | 'update' | 'delete',
  senderClientId?: string,
): Promise<void> {
  try {
    const doId = env.SYNC_HUB.idFromName('global');
    const hub = env.SYNC_HUB.get(doId);
    await hub.fetch(new Request('http://internal/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, action, senderClientId }),
    }));
  } catch (err) {
    // Don't fail the mutation if SSE notification fails
    console.error('Failed to notify SyncHub:', err);
  }
}
