// The slice of D1 that `queries.ts` uses, owned here instead of imported: it is
// what lets those 700 lines run unchanged on `node:sqlite` (see sqlite.ts).

export interface D1Meta {
  changes: number;
  last_row_id: number;
  duration: number;
  rows_read: number;
  rows_written: number;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

export interface D1PreparedStatement {
  /** Returns a NEW statement with the values bound; never mutates this one. */
  bind(...values: unknown[]): D1PreparedStatement;
  /** `null` — not `undefined` — when there is no row. */
  first<T = Record<string, unknown>>(): Promise<T | null>;
  first<T = unknown>(column: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  /** Runs every statement in a single transaction, in order. */
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}
