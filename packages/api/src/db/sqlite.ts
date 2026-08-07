import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result } from './d1.ts';

// `node:sqlite` is synchronous; the async signatures stay because D1's are and
// the callers await them.

/** SQLite binds numbers, strings, null, and buffers. Everything else is coerced. */
function toBindable(value: unknown): null | number | string | bigint | Uint8Array {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string') {
    return value;
  }
  if (value instanceof Uint8Array) return value;
  return String(value);
}

/** Rows arrive with a null prototype; downstream spreads and JSON expect plain ones. */
function toPlainRow<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

function emptyMeta(changes = 0, lastRowId = 0) {
  return {
    changes,
    last_row_id: lastRowId,
    duration: 0,
    rows_read: 0,
    rows_written: changes,
  };
}

export function createSqliteD1(filename: string): D1Database & { close(): void } {
  const db = new DatabaseSync(filename);

  // Off by default in SQLite, unlike D1: without it the join tables keep orphans.
  db.exec('PRAGMA foreign_keys = ON');
  // WAL so readers don't block the writer while SSE clients poll.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');

  /** Compiled statements are reused: the same handful of SQL strings run constantly. */
  const compiled = new Map<string, StatementSync>();

  function compile(sql: string): StatementSync {
    const cached = compiled.get(sql);
    if (cached) return cached;
    const statement = db.prepare(sql);
    compiled.set(sql, statement);
    return statement;
  }

  // One path for every D1 method: with columns it is a query, without them a
  // write. That is what makes `batch()` take SELECTs and DELETEs alike.
  function execute<T>(sql: string, params: unknown[]): D1Result<T> {
    const statement = compile(sql);
    const bound = params.map(toBindable);

    if (statement.columns().length > 0) {
      const rows = statement.all(...bound).map((row) => toPlainRow<T>(row));
      return { results: rows, success: true, meta: emptyMeta() };
    }

    const { changes, lastInsertRowid } = statement.run(...bound);
    return {
      results: [],
      success: true,
      meta: emptyMeta(Number(changes), Number(lastInsertRowid)),
    };
  }

  function statementFor(sql: string, params: unknown[]): D1PreparedStatement {
    return {
      bind(...values: unknown[]) {
        return statementFor(sql, values);
      },

      async first<T>(column?: string): Promise<T | null> {
        const { results } = execute<Record<string, unknown>>(sql, params);
        const row = results[0];
        // D1 returns null, not undefined, and callers check `=== null`.
        if (row === undefined) return null;
        if (column === undefined) return row as T;
        return (row[column] ?? null) as T;
      },

      async all<T>() {
        return execute<T>(sql, params);
      },

      async run<T>() {
        return execute<T>(sql, params);
      },
    };
  }

  return {
    prepare(sql: string) {
      return statementFor(sql, []);
    },

    async batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      // A transaction, like D1's: /api/data/import empties the seven tables
      // before refilling them, and half of that applied loses data.
      db.exec('BEGIN IMMEDIATE');
      try {
        const results: D1Result<T>[] = [];
        for (const statement of statements) {
          results.push(await statement.all<T>());
        }
        db.exec('COMMIT');
        return results;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    async exec(sql: string) {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },

    close() {
      db.close();
    },
  };
}
