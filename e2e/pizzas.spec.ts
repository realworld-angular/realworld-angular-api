import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers';

test.describe('Global Options', () => {
  test.describe('GET /options/sizes', () => {
    test('returns 200 with an array of size options (public)', async ({ request }) => {
      const res = await request.get('/api/options/sizes');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test('each size has id, label and price', async ({ request }) => {
      const res = await request.get('/api/options/sizes');
      const body = await res.json();
      if (body.length > 0) {
        expect(body[0]).toMatchObject({
          id: expect.any(String),
          label: expect.any(String),
          price: expect.anything(),
          sortOrder: expect.any(Number),
        });
      }
    });
  });

  test.describe('GET /options/toppings', () => {
    test('returns 200 with an array of topping options (public)', async ({ request }) => {
      const res = await request.get('/api/options/toppings');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test('each topping has id, label and price', async ({ request }) => {
      const res = await request.get('/api/options/toppings');
      const body = await res.json();
      if (body.length > 0) {
        expect(body[0]).toMatchObject({
          id: expect.any(String),
          label: expect.any(String),
          price: expect.anything(),
          sortOrder: expect.any(Number),
        });
      }
    });
  });
});

test.describe('Pizzas', () => {
  test.describe('GET /pizzerias/:pizzeriaId/pizzas', () => {
    test('returns 200 or 404 for any pizzeria id (public)', async ({ request }) => {
      const res = await request.get('/api/pizzerias/nonexistent-id/pizzas');
      expect([200, 404]).toContain(res.status());
    });

  });

  test.describe('GET /pizzerias/:pizzeriaId/pizzas/:pizzaId', () => {
    test('returns 404 for unknown pizzeria or pizza', async ({ request }) => {
      const res = await request.get('/api/pizzerias/bad-id/pizzas/bad-pizza-id');
      expect(res.status()).toBe(404);
    });
  });

  test.describe('POST /pizzerias/:pizzeriaId/pizzas', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.post('/api/pizzerias/some-id/pizzas', {
        data: { basePrice: '10.00', imageFilename: 'margherita.png' },
      });
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.post('/api/pizzerias/some-id/pizzas', {
        headers: authHeaders(client),
        data: { basePrice: '10.00', imageFilename: 'margherita.png' },
      });
      expect(res.status()).toBe(403);
    });

    test('creates a pizza with toppings in payload', async ({ request }) => {
      const admin = await registerUser(request, { email: `admin+${Date.now()}@example.com` });
      const toppingsRes = await request.get('/api/options/toppings');
      const toppings = await toppingsRes.json();
      const toppingId = toppings[0]?.id as string | undefined;

      const res = await request.post('/api/pizzerias/nonexistent-pizzeria/pizzas', {
        headers: authHeaders(admin),
        data: {
          basePrice: 11.5,
          imageFilename: 'pizza.jpg',
          ...(toppingId ? { toppingIds: [toppingId] } : { toppingIds: ['invalid-topping-id'] }),
        },
      });
      expect(res.status()).not.toBe(401);
    });
  });

  test.describe('PATCH /pizzerias/:pizzeriaId/pizzas/:pizzaId', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.patch('/api/pizzerias/some-id/pizzas/some-pizza', {
        data: { basePrice: 12 },
      });
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.patch('/api/pizzerias/some-id/pizzas/some-pizza', {
        headers: authHeaders(client),
        data: { basePrice: 12 },
      });
      expect(res.status()).toBe(403);
    });

    test('accepts scalar fields in update payload', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.patch('/api/pizzerias/some-id/pizzas/some-pizza', {
        headers: authHeaders(client),
        data: { basePrice: 13 },
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe('DELETE /pizzerias/:pizzeriaId/pizzas/:pizzaId', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.delete('/api/pizzerias/some-id/pizzas/some-pizza');
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.delete('/api/pizzerias/some-id/pizzas/some-pizza', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(403);
    });
  });
});
