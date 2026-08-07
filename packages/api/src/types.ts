import type { D1Database } from './db/d1.ts';
import type { SyncHub } from './sync-hub.ts';

export interface Env {
  DB: D1Database;
  SYNC_HUB: SyncHub;
  /** "user1:pass1,user2:pass2" — see middleware/basic-auth.ts */
  SOLILUNA_AUTH?: string;
}
