import app from './index.ts';
import { start } from './runtime.ts';

// Production entry. No default is safe on a server, so there are none: the
// `/api/__test` routes are mounted only by dev.ts and do not exist here.

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  console.error('DB_PATH is not set: refusing to guess where the database lives.');
  process.exit(1);
}

// No fallback for the credentials: the middleware answers 503 without them.
start({
  app,
  dbPath,
  port: Number(process.env.PORT ?? 8787),
  auth: process.env.SOLILUNA_AUTH,
});
