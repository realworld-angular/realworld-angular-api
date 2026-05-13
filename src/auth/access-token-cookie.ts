import type { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/** Options for the HTTP-only JWT session cookie (shared by auth and invite-accept). */
export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
