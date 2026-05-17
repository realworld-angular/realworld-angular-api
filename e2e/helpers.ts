import { APIRequestContext } from '@playwright/test';

/** Base URL used by all helpers — must match `use.baseURL` in playwright.config.ts */
const BASE = '/api';

// ---------------------------------------------------------------------------
// Unique value generators
// ---------------------------------------------------------------------------

let _seq = 0;
const _workerPrefix = Math.random().toString(36).slice(2, 7);
export function uid(): string {
  return `${_workerPrefix}${(++_seq).toString(36)}`;
}

export function uniqueEmail(): string {
  return `test+${uid()}@example.com`;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthedUser extends UserCredentials {
  id: string;
  role: string;
  name: string;
  /** Raw Set-Cookie header value (contains signed access_token) */
  cookieHeader: string;
}

/**
 * Register a new user with CUSTOMER role (default) and return their credentials
 * plus the cookie header needed for subsequent authenticated requests.
 */
export async function registerUser(
  request: APIRequestContext,
  overrides: Partial<UserCredentials> = {},
): Promise<AuthedUser> {
  const creds: UserCredentials = {
    email: uniqueEmail(),
    password: 'password123',
    ...overrides,
  };

  const res = await request.post(`${BASE}/auth/register`, {
    data: creds,
  });

  if (!res.ok()) {
    throw new Error(`register failed ${res.status()}: ${await res.text()}`);
  }

  const body = await res.json();
  const setCookieHeader = res.headers()['set-cookie'] ?? '';

  // Extract just the cookie value (name=value part before any ; options)
  const cookieMatch = setCookieHeader.match(/access_token=[^;]+/);
  const cookieHeader = cookieMatch ? cookieMatch[0] : '';

  return {
    ...creds,
    id: body.id,
    role: body.role,
    name: body.name,
    cookieHeader,
  };
}

/**
 * Register a new user with PIZZERIA_ADMIN role and return credentials + cookie header.
 */
export async function registerPizzeriaOwner(
  request: APIRequestContext,
  overrides: Partial<UserCredentials> = {},
): Promise<AuthedUser> {
  const creds: UserCredentials = {
    email: uniqueEmail(),
    password: 'password123',
    ...overrides,
  };

  const res = await request.post(`${BASE}/auth/register-pizzeria-owner`, {
    data: creds,
  });

  if (!res.ok()) {
    throw new Error(`registerPizzeriaOwner failed ${res.status()}: ${await res.text()}`);
  }

  const body = await res.json();
  const setCookieHeader = res.headers()['set-cookie'] ?? '';
  const cookieMatch = setCookieHeader.match(/access_token=[^;]+/);
  const cookieHeader = cookieMatch ? cookieMatch[0] : '';

  return {
    ...creds,
    id: body.id,
    role: body.role,
    name: body.name,
    cookieHeader,
  };
}

/**
 * Build the Cookie header string for authenticated requests.
 */
export function authHeaders(user: AuthedUser): Record<string, string> {
  return { Cookie: user.cookieHeader };
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

export interface CreatedPizzeria {
  id: string;
  name: string;
}

/** Create a pizzeria owned by the given PIZZERIA_ADMIN user */
export async function createPizzeria(
  request: APIRequestContext,
  owner: AuthedUser,
  overrides: Record<string, unknown> = {},
): Promise<CreatedPizzeria> {
  const res = await request.post(`${BASE}/pizzerias`, {
    headers: authHeaders(owner),
    data: {
      city: 'Naples',
      country: 'Italy',
      imageFilename: 'pizzeria.jpg',
      ...overrides,
    },
  });

  if (!res.ok()) {
    throw new Error(`createPizzeria failed ${res.status()}: ${await res.text()}`);
  }

  return res.json();
}

export interface CreatedPizza {
  id: string;
  name: string;
  basePrice: string;
}

/** Create a pizza inside a pizzeria */
export async function createPizza(
  request: APIRequestContext,
  user: AuthedUser,
  pizzeriaId: string,
  overrides: Record<string, unknown> = {},
): Promise<CreatedPizza> {
  const toppingsRes = await request.get(`${BASE}/options/toppings`);
  const toppings = await toppingsRes.json();
  const firstToppingId = toppings[0]?.id as string | undefined;
  if (!firstToppingId) {
    throw new Error('createPizza helper: no topping options returned from /options/toppings');
  }

  const res = await request.post(`${BASE}/pizzerias/${pizzeriaId}/pizzas`, {
    headers: authHeaders(user),
    data: {
      basePrice: '12.99',
      imageFilename: 'margherita.png',
      toppingIds: [firstToppingId],
      ...overrides,
    },
  });

  if (!res.ok()) {
    throw new Error(`createPizza failed ${res.status()}: ${await res.text()}`);
  }

  return res.json();
}
