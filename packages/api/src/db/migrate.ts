import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Each file runs in a transaction, so one that fails halfway leaves the
// database as it was and stays unapplied.

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

const BOOKKEEPING = `
  CREATE TABLE IF NOT EXISTS migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
  )
`;

/** Returns the names of the migrations it applied, in order. */
export function migrate(db: DatabaseSync, dir = MIGRATIONS_DIR): string[] {
  db.exec(BOOKKEEPING);

  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((row) => (row as { name: string }).name),
  );

  const pending = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .filter((name) => !applied.has(name));

  for (const name of pending) {
    const sql = readFileSync(join(dir, name), 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${name} failed: ${(err as Error).message}`, { cause: err });
    }
  }

  return pending;
}

/** Opens the database at `filename`, migrates it, and closes it again. */
export function migrateFile(filename: string): string[] {
  const db = new DatabaseSync(filename);
  try {
    return migrate(db);
  } finally {
    db.close();
  }
}

// Runnable alone (`pnpm db:migrate`) for a database prepared without the server.
if (import.meta.main) {
  const target = process.argv[2] ?? process.env.DB_PATH;
  if (!target) {
    console.error('usage: node src/db/migrate.ts <path-to-db>   (or DB_PATH=...)');
    process.exit(1);
  }
  const applied = migrateFile(target);
  console.log(applied.length > 0 ? `applied: ${applied.join(', ')}` : 'nothing to apply');
}
