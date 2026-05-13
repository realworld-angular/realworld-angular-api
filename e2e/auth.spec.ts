import { test, expect } from '@playwright/test';
import { uniqueEmail, registerUser, authHeaders } from './helpers';

test.describe('Auth', () => {
  test.describe('POST /auth/register', () => {
    test('registers a new user and returns user data', async ({ request }) => {
      const email = uniqueEmail();
      const res = await request.post('/api/auth/register', {
        data: { email, password: 'password123' },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({
        id: expect.any(String),
        email,
        role: 'CUSTOMER',
        name: expect.any(String),
      });
      // passwordHash must never be exposed
      expect(body.passwordHash).toBeUndefined();

      // Register should also log the user in by issuing the auth cookie
      const cookie = res.headers()['set-cookie'];
      expect(cookie).toContain('access_token=');
      expect(cookie).toContain('HttpOnly');
    });

    test('rejects duplicate email with 409', async ({ request }) => {
      const email = uniqueEmail();
      await request.post('/api/auth/register', {
        data: { email, password: 'password123' },
      });

      const res = await request.post('/api/auth/register', {
        data: { email, password: 'password123' },
      });
      expect(res.status()).toBe(409);
    });

    test('rejects invalid email with 400', async ({ request }) => {
      const res = await request.post('/api/auth/register', {
        data: { email: 'not-an-email', password: 'password123' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejects short password with 400', async ({ request }) => {
      const res = await request.post('/api/auth/register', {
        data: { email: uniqueEmail(), password: 'short' },
      });
      expect(res.status()).toBe(400);
    });

    test('rejects missing fields with 400', async ({ request }) => {
      const res = await request.post('/api/auth/register', { data: {} });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('POST /auth/login', () => {
    test('logs in and sets HttpOnly access_token cookie', async ({ request }) => {
      const email = uniqueEmail();
      await request.post('/api/auth/register', {
        data: { email, password: 'password123' },
      });

      const res = await request.post('/api/auth/login', {
        data: { email, password: 'password123' },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        id: expect.any(String),
        email,
        role: 'CUSTOMER',
      });

      const cookie = res.headers()['set-cookie'];
      expect(cookie).toContain('access_token=');
      expect(cookie).toContain('HttpOnly');
    });

    test('rejects wrong password with 401', async ({ request }) => {
      const email = uniqueEmail();
      await request.post('/api/auth/register', {
        data: { email, password: 'password123' },
      });

      const res = await request.post('/api/auth/login', {
        data: { email, password: 'wrongpassword' },
      });
      expect(res.status()).toBe(401);
    });

    test('rejects unknown email with 401', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: { email: 'nobody@example.com', password: 'password123' },
      });
      expect(res.status()).toBe(401);
    });

    test('rejects missing body with 400', async ({ request }) => {
      const res = await request.post('/api/auth/login', { data: {} });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('POST /auth/logout', () => {
    test('clears the access_token cookie', async ({ request }) => {
      const user = await registerUser(request);

      const res = await request.post('/api/auth/logout', {
        headers: authHeaders(user),
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Logged out');

      // Cookie should be cleared (Max-Age=0 or expires in the past)
      const cookie = res.headers()['set-cookie'] ?? '';
      expect(cookie).toContain('access_token=');
    });
  });

  test.describe('GET /auth/me', () => {
    test('returns the current authenticated user', async ({ request }) => {
      const user = await registerUser(request);

      const res = await request.get('/api/auth/me', {
        headers: authHeaders(user),
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        id: user.id,
        email: user.email,
        role: 'CUSTOMER',
      });
    });

    test('returns 401 without auth cookie', async ({ request }) => {
      const res = await request.get('/api/auth/me');
      expect(res.status()).toBe(401);
    });

    test('returns 401 with invalid token', async ({ request }) => {
      const res = await request.get('/api/auth/me', {
        headers: { Cookie: 'access_token=invalid.jwt.token' },
      });
      expect(res.status()).toBe(401);
    });
  });
});
