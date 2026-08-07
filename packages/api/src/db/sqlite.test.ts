import { describe, expect, it } from 'vitest';
import { createSqliteD1 } from './sqlite.ts';

// The shim is what the 700 lines of queries.ts talk to, so the parts of D1's
// behaviour they rely on are checked here: batch is a transaction, first()
// answers null, and a write reports how many rows it changed.

function freshDb() {
  const db = createSqliteD1(':memory:');
  return db;
}

async function withTable() {
  const db = freshDb();
  await db.exec(`
    CREATE TABLE parents (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE
    );
  `);
  return db;
}

describe('createSqliteD1', () => {
  it('first() returns null, not undefined, when there is no row', async () => {
    const db = await withTable();
    const row = await db.prepare('SELECT * FROM parents WHERE id = ?').bind('nope').first();
    expect(row).toBeNull();
  });

  it('first(column) returns the single value', async () => {
    const db = await withTable();
    await db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno').run();
    expect(await db.prepare('SELECT name FROM parents').first('name')).toBe('uno');
  });

  it('run() reports the number of changed rows', async () => {
    const db = await withTable();
    await db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno').run();
    const { meta } = await db.prepare('UPDATE parents SET name = ? WHERE id = ?').bind('dos', 'p1').run();
    expect(meta.changes).toBe(1);
  });

  it('bind() does not mutate the statement it came from', async () => {
    const db = await withTable();
    const insert = db.prepare('INSERT INTO parents VALUES (?, ?)');
    await insert.bind('p1', 'uno').run();
    await insert.bind('p2', 'dos').run();
    const { results } = await db.prepare('SELECT id FROM parents ORDER BY id').all();
    expect(results).toEqual([{ id: 'p1' }, { id: 'p2' }]);
  });

  it('batch() returns one result per statement, in order', async () => {
    const db = await withTable();
    await db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno').run();
    const [parents, children] = await db.batch([
      db.prepare('SELECT * FROM parents'),
      db.prepare('SELECT * FROM children'),
    ]);
    expect(parents.results).toHaveLength(1);
    expect(children.results).toHaveLength(0);
  });

  it('batch() rolls back every statement when one fails', async () => {
    const db = await withTable();
    await db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno').run();

    await expect(
      db.batch([
        db.prepare('DELETE FROM parents'),
        // Duplicate primary key: this one throws, and the DELETE must not stick.
        db.prepare('INSERT INTO children VALUES (?, ?)').bind('c1', 'p1'),
        db.prepare('INSERT INTO children VALUES (?, ?)').bind('c1', 'p1'),
      ]),
    ).rejects.toThrow();

    const { results } = await db.prepare('SELECT * FROM parents').all();
    expect(results).toHaveLength(1);
  });

  it('enforces foreign keys, like D1 does', async () => {
    const db = await withTable();
    await expect(
      db.prepare('INSERT INTO children VALUES (?, ?)').bind('c1', 'ghost').run(),
    ).rejects.toThrow();
  });

  it('cascades deletes through the schema', async () => {
    const db = await withTable();
    await db.batch([
      db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno'),
      db.prepare('INSERT INTO children VALUES (?, ?)').bind('c1', 'p1'),
    ]);
    await db.prepare('DELETE FROM parents WHERE id = ?').bind('p1').run();
    const { results } = await db.prepare('SELECT * FROM children').all();
    expect(results).toHaveLength(0);
  });

  it('binds undefined as NULL', async () => {
    const db = await withTable();
    await db.exec('CREATE TABLE nullable (id TEXT PRIMARY KEY, note TEXT)');
    await db.prepare('INSERT INTO nullable VALUES (?, ?)').bind('n1', undefined).run();
    const row = await db.prepare('SELECT note FROM nullable').first<{ note: string | null }>();
    expect(row?.note).toBeNull();
  });

  it('returns rows as plain objects', async () => {
    const db = await withTable();
    await db.prepare('INSERT INTO parents VALUES (?, ?)').bind('p1', 'uno').run();
    const row = await db.prepare('SELECT * FROM parents').first();
    // Rows arrive from node:sqlite with a null prototype; spreads and instanceof
    // checks downstream expect a normal object.
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
  });
});
