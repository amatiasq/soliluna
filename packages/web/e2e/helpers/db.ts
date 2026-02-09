import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:8787';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500));
    } catch {
      // Server might be temporarily unavailable
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Request failed after ${retries} retries: ${url}`);
}

export async function resetDB() {
  await fetchWithRetry(`${API}/api/__test/reset`, { method: 'POST' });
}

export async function seedDB() {
  await resetDB();
  const sqlPath = path.join(__dirname, '..', 'fixtures', 'seed.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await fetchWithRetry(`${API}/api/__test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: sql,
  });
  // Let the server stabilize after bulk operations
  await new Promise((r) => setTimeout(r, 100));
}
