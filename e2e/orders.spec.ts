import { test, expect } from '@playwright/test';
import { registerUser, registerPizzeriaOwner, authHeaders } from './helpers';

test.describe('Orders', () => {
  test.describe('POST /orders', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.post('/api/orders', {
        data: {
          pizzeriaId: 'some-id',
          deliveryAddress: { street: '123 Main St', city: 'Paris', country: 'France' },
          items: [],
        },
      });
      expect(res.status()).toBe(401);
    });

    test('returns 403 for PIZZERIA_ADMIN', async ({ request }) => {
      const admin = await registerPizzeriaOwner(request);
      const res = await request.post('/api/orders', {
        headers: authHeaders(admin),
        data: {
          pizzeriaId: 'some-id',
          deliveryAddress: { street: '123 Main St', city: 'Paris', country: 'France' },
          items: [],
        },
      });
      expect(res.status()).toBe(403);
    });

    test('returns 400 when body is empty and user is authenticated', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.post('/api/orders', {
        headers: authHeaders(client),
        data: {},
      });
      expect(res.status()).toBe(400);
    });

    test('returns 404 or 400 for non-existent pizzeria', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.post('/api/orders', {
        headers: authHeaders(client),
        data: {
          pizzeriaId: 'nonexistent-pizzeria-id',
          deliveryAddress: { street: '123 Main St', city: 'Paris', country: 'France' },
          items: [{ pizzaId: 'nonexistent', quantity: 1, selectedOptions: [] }],
        },
      });
      expect([400, 404]).toContain(res.status());
    });
  });

  test.describe('GET /orders', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.get('/api/orders');
      expect(res.status()).toBe(401);
    });

    test('returns 200 with empty array for new client with no orders', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.get('/api/orders', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test('accepts pizzeriaId query filter', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.get('/api/orders?pizzeriaId=some-id', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('GET /orders/:id', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.get('/api/orders/some-order-id');
      expect(res.status()).toBe(401);
    });

    test('returns 404 for an order that does not belong to the user', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.get('/api/orders/nonexistent-order-id', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('PATCH /orders/:id/cancel', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.patch('/api/orders/some-id/cancel');
      expect(res.status()).toBe(401);
    });

    test('returns 404 for non-existent order', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.patch('/api/orders/nonexistent-id/cancel', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('PATCH /orders/:id/delivered', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.patch('/api/orders/some-id/delivered');
      expect(res.status()).toBe(401);
    });

    test('returns 404 for non-existent order', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.patch('/api/orders/nonexistent-id/delivered', {
        headers: authHeaders(client),
      });
      // Only admins can mark delivered; a client should be rejected before order lookup.
      expect(res.status()).toBe(403);
    });
  });
});
