import { test, expect } from '@playwright/test';
import { registerUser, authHeaders, uniqueEmail } from './helpers';

test.describe('Staff', () => {
  test.describe('POST /pizzerias/:pizzeriaId/invitations', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.post('/api/pizzerias/some-id/invitations');
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.post('/api/pizzerias/some-id/invitations', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe('POST /invitations/:token/accept', () => {
    test('returns 404 for an invalid/non-existent invite token', async ({ request }) => {
      const res = await request.post('/api/invitations/invalid-token-xyz/accept', {
        data: {
          email: uniqueEmail(),
          password: 'password123',
        },
      });
      expect(res.status()).toBe(404);
    });

    test('returns 400 when body is invalid', async ({ request }) => {
      const res = await request.post('/api/invitations/some-token/accept', {
        data: {},
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('GET /pizzerias/:pizzeriaId/staff', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.get('/api/pizzerias/some-id/staff');
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.get('/api/pizzerias/some-id/staff', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe('DELETE /pizzerias/:pizzeriaId/staff/:userId', () => {
    test('returns 401 for unauthenticated requests', async ({ request }) => {
      const res = await request.delete('/api/pizzerias/some-id/staff/some-user-id');
      expect(res.status()).toBe(401);
    });

    test('returns 403 for CUSTOMER role', async ({ request }) => {
      const client = await registerUser(request);
      const res = await request.delete('/api/pizzerias/some-id/staff/some-user-id', {
        headers: authHeaders(client),
      });
      expect(res.status()).toBe(403);
    });
  });
});
