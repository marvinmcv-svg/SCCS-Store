import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

export const CART_COOKIE = 'sccs_cart';

/** Read-only (safe in Server Components). */
export async function readCartToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

/** Creates the anonymous cart cookie if missing. Only callable from actions/route handlers. */
export async function ensureCartToken(): Promise<string> {
  const existing = (await cookies()).get(CART_COOKIE)?.value;
  return existing ?? setNewToken();
}

async function setNewToken() {
  const token = randomBytes(18).toString('base64url');
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return token;
}

/** Issue a fresh anonymous cart token (sign-out, or cookie owned by another account). */
export async function rotateCartToken(): Promise<string> {
  return setNewToken();
}
