import { join } from 'node:path';
import app from './index.ts';
import testRoutes from './routes/test.ts';
import { start } from './runtime.ts';

// Local entry (`pnpm dev`) and the E2E suites. Never deployed: production runs
// serve.ts, so the destructive test routes below do not exist there.

// After the SPA catch-all, which is GET-only, so these POSTs still match.
app.route('/api/__test', testRoutes);

/** Credentials used locally and by the E2E suite. */
const DEV_AUTH = 'dev:dev';

/** Gitignored, and recreated by the migrations whenever it is deleted. */
const DEV_DB = join(import.meta.dirname, '../local.db');

start({
  app,
  dbPath: process.env.DB_PATH ?? DEV_DB,
  port: Number(process.env.PORT ?? 8787),
  auth: process.env.SOLILUNA_AUTH || DEV_AUTH,
});
