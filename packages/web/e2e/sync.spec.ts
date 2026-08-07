import { test, expect } from '@playwright/test';
import http from 'node:http';
import { seedDB } from './helpers/db';

const API = 'http://localhost:8787';
const AUTH = `Basic ${Buffer.from('dev:dev').toString('base64')}`;
const EPOCH = '1970-01-01T00:00:00.000Z';

/**
 * Opens an SSE connection and stops reading from it, which is what a sleeping
 * laptop or a phone off the network leaves behind. Returns a function that
 * closes it.
 */
function abandonedSSEClient(): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const request = http.get(
      `${API}/api/events?clientId=abandoned`,
      { headers: { Authorization: AUTH } },
      (response) => {
        response.once('data', () => {
          response.pause(); // read nothing else, ever
          resolve(() => request.destroy());
        });
      },
    );
    request.on('error', reject);
  });
}

test.describe('Sync', () => {
  test.beforeEach(async () => {
    await seedDB();
  });

  test('/api/sync/changes desde el epoch devuelve todo y con los mismos costes', async ({
    request,
  }) => {
    const [changesResponse, dishesResponse] = await Promise.all([
      request.get(`${API}/api/sync/changes?since=${encodeURIComponent(EPOCH)}`, {
        headers: { Authorization: AUTH },
      }),
      request.get(`${API}/api/dishes`, { headers: { Authorization: AUTH } }),
    ]);

    expect(changesResponse.status()).toBe(200);
    const changes = (await changesResponse.json()).data;
    const dishes = (await dishesResponse.json()).data;

    expect(changes.ingredients.length).toBeGreaterThan(0);
    expect(changes.recipes.length).toBeGreaterThan(0);
    expect(changes.dishes.length).toBe(dishes.length);

    // The costs must match the list endpoint: both assemble the same way now
    const costsFromChanges = Object.fromEntries(
      changes.dishes.map((d: { id: string; baseCost: number }) => [d.id, d.baseCost]),
    );
    for (const dish of dishes) {
      expect(costsFromChanges[dish.id]).toBe(dish.baseCost);
    }
  });

  test('un cliente SSE que dejó de leer no retrasa las escrituras', async ({ request }) => {
    const close = await abandonedSSEClient();

    try {
      const listed = await request.get(`${API}/api/ingredients`, {
        headers: { Authorization: AUTH },
      });
      const ingredient = (await listed.json()).data[0];

      const started = Date.now();
      const response = await request.put(`${API}/api/ingredients/${ingredient.id}`, {
        headers: { Authorization: AUTH, 'X-Client-Id': 'e2e' },
        data: {
          name: ingredient.name,
          pkgSize: ingredient.pkgSize,
          pkgUnit: ingredient.pkgUnit,
          pkgPrice: ingredient.pkgPrice,
          updatedAt: ingredient.updatedAt,
        },
      });
      const elapsed = Date.now() - started;

      expect(response.status()).toBe(200);
      // Broadcasting to the other tabs happens in waitUntil, so the write never
      // waits for it. Before, a stuck client hung the PUT indefinitely.
      expect(elapsed).toBeLessThan(5000);
    } finally {
      close();
    }
  });
});
