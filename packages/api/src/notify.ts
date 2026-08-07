import type { Env } from './types.ts';
import type { SyncAction, SyncEntity } from './sync-hub.ts';

/** Returns void so it can't be awaited: a stuck SSE client hung every mutation. */
export function notifyChange(
  env: Env,
  entity: SyncEntity,
  id: string,
  action: SyncAction,
  senderClientId?: string,
): void {
  env.SYNC_HUB.notify(entity, id, action, senderClientId).catch((err) => {
    console.error('Failed to notify SyncHub:', err);
  });
}
