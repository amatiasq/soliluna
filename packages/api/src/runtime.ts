import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import type { Hono } from 'hono';
import { createSqliteD1 } from './db/sqlite.ts';
import { migrateFile } from './db/migrate.ts';
import { SyncHub } from './sync-hub.ts';
import type { Env } from './types.ts';

// Wires the app to the machine: serve.ts and dev.ts differ only in defaults.

export interface StartOptions {
  app: Hono<{ Bindings: Env }>;
  /** Path to the SQLite file. Created if it doesn't exist. */
  dbPath: string;
  port: number;
  /** "user1:pass1,..." — without it the app answers 503 to everything. */
  auth?: string;
}

export function start({ app, dbPath, port, auth }: StartOptions) {
  // A fresh volume is an empty directory, and SQLite won't create the path.
  mkdirSync(dirname(resolve(dbPath)), { recursive: true });

  // On boot, not in the deploy: a container that starts is a container migrated.
  const applied = migrateFile(dbPath);
  if (applied.length > 0) console.log(`migrations applied: ${applied.join(', ')}`);

  const db = createSqliteD1(dbPath);
  const env: Env = { DB: db, SYNC_HUB: new SyncHub(), SOLILUNA_AUTH: auth };

  const server = serve({ fetch: (request) => app.fetch(request, env), port }, (info) => {
    console.log(`soliluna listening on http://localhost:${info.port} (db: ${dbPath})`);
  });

  // Closing on SIGTERM checkpoints the WAL: the file left on the volume is the
  // whole database, not a database plus a journal nobody reads.
  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}
